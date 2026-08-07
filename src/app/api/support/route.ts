import { auth } from "@clerk/nextjs/server";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { createSupportInquiry } from "@/lib/db/queries";
import { notifySupportInquiry } from "@/lib/support_notify";

export const runtime = "nodejs";

const CATEGORY_SET = new Set(["billing", "usage", "bug", "other"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  let body: { email?: unknown; category?: unknown; message?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다."));
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "답변받을 이메일 주소를 확인해주세요."));
  }
  if (!CATEGORY_SET.has(category)) {
    return apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "문의 유형을 선택해주세요."));
  }
  if (message.length < 5 || message.length > 2000) {
    return apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "문의 내용은 5자 이상 2,000자 이하로 입력해주세요."));
  }

  let userId: string | null = null;
  try {
    userId = (await auth()).userId ?? null;
  } catch {
    userId = null;
  }

  const inquiry = { userId, email, category, message };
  const stored = await createSupportInquiry(inquiry);
  const notified = await notifySupportInquiry(inquiry);

  // 둘 중 하나라도 성공하면 운영자에게 닿는다. 둘 다 실패했을 때만 접수 실패로 응답.
  if (!stored && !notified) {
    return apiErrorResponse(
      new ApiError(503, "SUPPORT_UNAVAILABLE", "문의 접수가 일시적으로 어렵습니다. kwan765@naver.com 으로 메일을 보내주세요.")
    );
  }

  return Response.json({ ok: true }, { status: 201 });
}
