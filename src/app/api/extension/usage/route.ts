import { auth } from "@clerk/nextjs/server";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { logApiError } from "@/lib/api_log";
import {
  EXTENSION_FREE_DAILY_LIMIT,
  extensionDailyLimit,
  kstDayString,
  resolveExtensionTier,
  type ExtensionTier
} from "@/lib/extension_plan";
import { verifyExtensionToken } from "@/lib/extension_token";
import { consumeExtensionQuota, getExtensionUsageCount, recordFunnelEvent } from "@/lib/db/queries";
import { getErrorMessage } from "@/types/common";

export const runtime = "nodejs";

const MAX_CONSUME_PER_REQUEST = 5000;

// CORS: 익스텐션 팝업(chrome-extension://)에서 호출된다. /api/extension/analyze 와 동일 정책.
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "600"
  };
  if (origin && origin.startsWith("chrome-extension://")) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

function withCors(res: Response, cors: Record<string, string>): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

/** Bearer 익스텐션 토큰 우선, 없으면 동일 출처 Clerk 세션(연결 페이지)도 허용. */
async function resolveUserId(req: Request): Promise<string | null> {
  const verified = verifyExtensionToken(bearerToken(req));
  if (verified) return verified.userId;
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch {
    return null;
  }
}

type UsageStatus = {
  authenticated: boolean;
  tier: ExtensionTier | "anonymous";
  day: string;
  limit: number;
  used: number | null;
  remaining: number | null;
};

async function statusForUser(userId: string | null): Promise<UsageStatus> {
  const day = kstDayString();
  if (!userId) {
    return { authenticated: false, tier: "anonymous", day, limit: EXTENSION_FREE_DAILY_LIMIT, used: null, remaining: null };
  }
  const tier = await resolveExtensionTier(userId);
  const limit = extensionDailyLimit(tier);
  const used = await getExtensionUsageCount(userId, day);
  return {
    authenticated: true,
    tier,
    day,
    limit,
    used,
    remaining: used === null ? null : Math.max(0, limit - used)
  };
}

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function GET(req: Request): Promise<Response> {
  const cors = corsHeaders(req.headers.get("origin"));
  try {
    const status = await statusForUser(await resolveUserId(req));
    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...cors }
    });
  } catch (error) {
    await logApiError({
      route: "/api/extension/usage",
      method: "GET",
      status: 503,
      code: "QUOTA_CHECK_UNAVAILABLE",
      message: "사용량 조회에 실패했습니다.",
      details: getErrorMessage(error),
      request: req,
      error
    });
    return withCors(apiErrorResponse(new ApiError(503, "QUOTA_CHECK_UNAVAILABLE", "사용량을 확인할 수 없습니다. 잠시 후 다시 시도해주세요.")), cors);
  }
}

export async function POST(req: Request): Promise<Response> {
  const cors = corsHeaders(req.headers.get("origin"));
  const fail = (e: ApiError) => withCors(apiErrorResponse(e), cors);

  const verified = verifyExtensionToken(bearerToken(req));
  if (!verified) {
    return fail(new ApiError(401, "EXTENSION_AUTH_REQUIRED", "익스텐션 계정 연결이 필요합니다.", {
      help: ["ReviewBoost 사이트에서 익스텐션을 다시 연결해주세요."]
    }));
  }

  let count = 0;
  try {
    const body = (await req.json()) as { count?: unknown };
    count = Math.floor(Number(body.count));
  } catch {
    return fail(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다."));
  }
  if (!Number.isFinite(count) || count < 1 || count > MAX_CONSUME_PER_REQUEST) {
    return fail(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "수집 개수가 올바르지 않습니다."));
  }

  const day = kstDayString();
  try {
    const tier = await resolveExtensionTier(verified.userId);
    const limit = extensionDailyLimit(tier);
    const result = await consumeExtensionQuota({ userId: verified.userId, day, count, dailyLimit: limit });

    if (!result.ok && result.reason === "over_limit") {
      await recordFunnelEvent("extension_limit_hit", verified.userId, { tier, day, count });
      return fail(
        new ApiError(429, "EXTENSION_DAILY_LIMIT_EXCEEDED", `오늘 수집 한도(${limit.toLocaleString()}개)를 초과했습니다.`, {
          help:
            tier === "paid"
              ? ["내일 다시 시도해주세요."]
              : ["익스텐션 플랜을 구독하면 하루 2,000개까지 수집할 수 있습니다."]
        })
      );
    }

    // storage_off: DB 미구성 — 미터링 불가, 수집은 허용 (graceful degradation).
    const used = result.ok ? result.used : 0;
    return new Response(
      JSON.stringify({ ok: true, tier, day, limit, used, remaining: Math.max(0, limit - used) }),
      { status: 200, headers: { "content-type": "application/json", "cache-control": "no-store", ...cors } }
    );
  } catch (error) {
    await logApiError({
      route: "/api/extension/usage",
      method: "POST",
      status: 503,
      code: "QUOTA_CHECK_UNAVAILABLE",
      message: "쿼터 처리에 실패했습니다.",
      details: getErrorMessage(error),
      request: req,
      error
    });
    // fail closed: DB 오류가 한도를 조용히 무력화하면 안 된다 (reserveMonthlyQuotaSlot 과 동일).
    return fail(new ApiError(503, "QUOTA_CHECK_UNAVAILABLE", "요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요."));
  }
}
