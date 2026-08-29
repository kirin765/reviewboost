import { auth } from "@clerk/nextjs/server";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { verifyExtensionToken } from "@/lib/extension_token";
import { recordFunnelEvent } from "@/lib/db/queries";

export const runtime = "nodejs";

// CORS: 익스텐션 팝업(chrome-extension://)에서 호출된다. /api/extension/usage 와 동일 정책.
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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

/** Bearer 익스텐션 토큰 우선, 없으면 Clerk 세션. 둘 다 없으면 익명 허용. */
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

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request): Promise<Response> {
  const cors = corsHeaders(req.headers.get("origin"));

  let name: unknown;
  try {
    const body = (await req.json()) as { name?: unknown };
    name = body.name;
  } catch {
    return withCors(apiErrorResponse(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다.")), cors);
  }
  const eventName =
    name === "limit_hit"
      ? "extension_limit_hit"
      : name === "usage_anonymous_attempt"
        ? "extension_usage_anonymous_attempt"
        : name === "usage_post_401"
          ? "extension_usage_post_401"
          : name === "usage_post_503"
            ? "extension_usage_post_503"
            : name === "usage_post_network_error"
              ? "extension_usage_post_network_error"
              : null;
  if (!eventName) {
    return withCors(apiErrorResponse(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "지원하지 않는 이벤트입니다.")), cors);
  }

  // 계측은 best-effort — DB 미구성/오류가 익스텐션 동작을 막지 않는다.
  const userId = await resolveUserId(req);
  await recordFunnelEvent(eventName, userId, { source: name === "limit_hit" ? "popup" : "usage_post" });

  return new Response(null, { status: 204, headers: cors });
}
