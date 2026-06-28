import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { logApiError } from "@/lib/api_log";
import { downloadCoupangCsv } from "@/lib/coupang_crawler";
import { runAnalysisPipeline } from "@/lib/analysis_pipeline";
import { getClientIp } from "@/lib/request-utils";
import { getErrorMessage } from "@/types/common";

export const runtime = "nodejs";
export const maxDuration = 300;

const REQUEST_BUDGET_MS = Math.max(0, maxDuration * 1000 - 1500);

// Soft per-IP guard (best-effort, per-instance). The crawl itself is the real cost ceiling.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 6;
const hits = new Map<string, number[]>();

function rateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

type RequestBody = { productUrl?: string };

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  const clientIp = getClientIp(req);
  if (rateLimited(clientIp)) {
    return apiErrorResponse(
      new ApiError(429, "FREE_REPORT_RATE_LIMITED", "무료 분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.")
    );
  }

  let body: RequestBody | null = null;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return apiErrorResponse(new ApiError(400, "CRAWLER_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다."));
  }

  const productUrl = String(body?.productUrl ?? "").trim();
  if (!productUrl) {
    return apiErrorResponse(new ApiError(400, "CRAWLER_INVALID_PRODUCT_URL", "상품 URL을 입력해주세요."));
  }

  const startedAtMs = Date.now();

  try {
    const { csvBuffer } = await downloadCoupangCsv({ productUrl });
    const csvText = new TextDecoder("utf-8").decode(csvBuffer);

    const { payload } = await runAnalysisPipeline({
      csvText,
      headerMode: "header",
      textCol: "내용",
      ratingCol: "평점",
      dateCol: "작성일",
      plan: "free",
      useLLM: false,
      startedAtMs,
      timeBudgetMs: REQUEST_BUDGET_MS
    });

    payload.meta.filename = "쿠팡 상품 리뷰";

    return Response.json(payload, { headers: { "cache-control": "no-store" } });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 500;
    await logApiError({
      route: "/api/free-report",
      method: req.method,
      status,
      code: error instanceof ApiError ? error.code : "INTERNAL_ERROR",
      message: error instanceof ApiError ? error.message : "무료 리포트 생성 중 오류가 발생했습니다.",
      details: getErrorMessage(error),
      request: req,
      error
    });

    if (error instanceof ApiError) return apiErrorResponse(error);
    return apiErrorResponse(new ApiError(500, "INTERNAL_ERROR", "무료 리포트 생성 중 오류가 발생했습니다."));
  }
}
