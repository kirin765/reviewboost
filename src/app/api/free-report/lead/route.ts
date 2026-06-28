import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { logApiError } from "@/lib/api_log";
import { getDb, schema } from "@/lib/db";
import { getClientIp } from "@/lib/request-utils";
import { getErrorMessage } from "@/types/common";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RequestBody = { email?: string; productUrl?: string };

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  let body: RequestBody | null = null;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return apiErrorResponse(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다."));
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return apiErrorResponse(new ApiError(400, "ANALYZE_PAYLOAD_INVALID", "올바른 이메일 주소를 입력해주세요."));
  }

  const productUrl = String(body?.productUrl ?? "").trim().slice(0, 2000) || null;
  const clientIp = getClientIp(req);

  // Best-effort persistence. Lead capture must never block the PDF the user is owed.
  const db = getDb();
  if (db) {
    try {
      await db.insert(schema.leads).values({ email, source: "free-report", productUrl, clientIp });
    } catch (error: unknown) {
      await logApiError({
        route: "/api/free-report/lead",
        method: req.method,
        status: 500,
        code: "INTERNAL_ERROR",
        message: "리드 저장 중 오류가 발생했습니다.",
        details: getErrorMessage(error),
        request: req,
        error
      });
    }
  }

  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
