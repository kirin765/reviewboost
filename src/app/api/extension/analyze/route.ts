import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { logApiError } from "@/lib/api_log";
import { runAnalysisPipeline } from "@/lib/analysis_pipeline";
import { getClientIp } from "@/lib/request-utils";
import type { ReviewRow } from "@/lib/types";
import { getErrorMessage } from "@/types/common";

export const runtime = "nodejs";
export const maxDuration = 60;

const REQUEST_BUDGET_MS = Math.max(0, maxDuration * 1000 - 1500);
const MAX_BYTES = 6 * 1024 * 1024; // mirror /api/analyze CSV limit
const MAX_REVIEWS = 1000; // free pipeline truncates further (50); guard the budget
const MAX_TEXT_LEN = 2000;

// Soft per-IP guard (best-effort, per-instance). No crawl here, so cap is higher than free-report.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_MAX = 20;
const hits = new Map<string, number[]>();

function rateLimited(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  if (hits.size > 5000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

// CORS: this endpoint is intentionally cross-origin (called from chrome-extension://).
// Echo the extension origin, never "*". Always set Vary: Origin.
function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Vary: "Origin",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
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

function clampRating(v: unknown): number | null {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(5, Math.max(0, n));
}

function isoDateOrNull(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const d = new Date(s);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function sanitizeRow(raw: unknown): ReviewRow {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    text: String(r.text ?? "").trim().slice(0, MAX_TEXT_LEN),
    rating: r.rating == null || r.rating === "" ? null : clampRating(r.rating),
    reviewedAt: isoDateOrNull(r.reviewedAt)
  };
}

function csvCell(v: string | number | null): string {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Serialize to the header shape free-report already feeds runAnalysisPipeline.
// 날짜는 YYYY-MM-DD 로 자른다: csv.ts toIsoDateOrNull 이 '.'→'-' 치환을 하므로
// 풀 ISO(밀리초의 '.')를 그대로 넘기면 파싱이 깨져 날짜가 null 이 된다.
function rowsToCsv(rows: ReviewRow[]): string {
  const lines = rows.map((r) =>
    [csvCell(r.text), csvCell(r.rating), csvCell(r.reviewedAt ? r.reviewedAt.slice(0, 10) : "")].join(",")
  );
  return ["내용,평점,작성일", ...lines].join("\n");
}

type RequestBody = { source?: unknown; reviews?: unknown };

export async function OPTIONS(req: Request): Promise<Response> {
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}

export async function POST(req: Request): Promise<Response> {
  const cors = corsHeaders(req.headers.get("origin"));
  const fail = (e: ApiError) => withCors(apiErrorResponse(e), cors);

  const clientIp = getClientIp(req);
  if (rateLimited(clientIp)) {
    return fail(new ApiError(429, "FREE_REPORT_RATE_LIMITED", "분석 요청이 너무 많습니다. 잠시 후 다시 시도해주세요."));
  }

  const contentLength = Number(req.headers.get("content-length") ?? "");
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
    return fail(new ApiError(413, "CSV_TOO_LARGE", "리뷰 데이터가 너무 큽니다. 개수를 줄여 다시 시도해주세요."));
  }

  let rawText: string;
  try {
    rawText = await req.text();
  } catch {
    return fail(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "요청 본문을 읽지 못했습니다."));
  }
  if (Buffer.byteLength(rawText, "utf8") > MAX_BYTES) {
    return fail(new ApiError(413, "CSV_TOO_LARGE", "리뷰 데이터가 너무 큽니다. 개수를 줄여 다시 시도해주세요."));
  }

  let body: RequestBody;
  try {
    body = JSON.parse(rawText) as RequestBody;
  } catch {
    return fail(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다."));
  }

  const source = body.source;
  if (source !== "coupang" && source !== "smartstore") {
    return fail(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "지원하지 않는 소스입니다."));
  }
  if (!Array.isArray(body.reviews)) {
    return fail(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "리뷰 목록이 필요합니다."));
  }

  const reviews = body.reviews.slice(0, MAX_REVIEWS).map(sanitizeRow).filter((r) => r.text.length > 0);
  if (reviews.length === 0) {
    return fail(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "수집된 리뷰가 없습니다."));
  }

  const startedAtMs = Date.now();
  try {
    const { payload } = await runAnalysisPipeline({
      csvText: rowsToCsv(reviews),
      headerMode: "header",
      textCol: "내용",
      ratingCol: "평점",
      dateCol: "작성일",
      plan: "free",
      useLLM: false,
      startedAtMs,
      timeBudgetMs: REQUEST_BUDGET_MS
    });

    payload.meta.filename = source === "coupang" ? "쿠팡 상품 리뷰" : "스마트스토어 상품 리뷰";

    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json", "cache-control": "no-store", ...cors }
    });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 500;
    await logApiError({
      route: "/api/extension/analyze",
      method: req.method,
      status,
      code: error instanceof ApiError ? error.code : "INTERNAL_ERROR",
      message: error instanceof ApiError ? error.message : "분석 중 오류가 발생했습니다.",
      details: getErrorMessage(error),
      request: req,
      error
    });

    if (error instanceof ApiError) return fail(error);
    return fail(new ApiError(500, "INTERNAL_ERROR", "분석 중 오류가 발생했습니다."));
  }
}
