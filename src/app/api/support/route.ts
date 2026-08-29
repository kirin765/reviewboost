import { auth } from "@clerk/nextjs/server";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import {
  csrfErrorResponse,
  extensionOrigin,
  isSameOriginRequest,
  withCorsHeaders
} from "@/lib/csrf";
import { createSupportInquiry } from "@/lib/db/queries";
import { notifySupportInquiry } from "@/lib/support_notify";

export const runtime = "nodejs";

const CATEGORY_SET = new Set(["billing", "usage", "bug", "other"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CORS_HEADERS = (origin: string) => ({
  "access-control-allow-origin": origin,
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
  vary: "Origin"
});

/** 확장 프로그램 팝업(CS 문의 폼)의 프리플라이트(OPTIONS) 응답. */
export async function OPTIONS(req: Request): Promise<Response> {
  const extOrigin = extensionOrigin(req);
  if (extOrigin) {
    return new Response(null, { status: 204, headers: CORS_HEADERS(extOrigin) });
  }
  // 비(非)확장 오리진 프리플라이트는 허용하지 않는다 — 웹 페이지 CSRF 방어 유지.
  return new Response(null, { status: 204 });
}

export async function POST(req: Request): Promise<Response> {
  // 허용 오리진: 동일 사이트(웹 폼) 또는 Chrome 확장 프로그램(팝업 CS 폼).
  const extOrigin = extensionOrigin(req);
  if (!isSameOriginRequest(req) && !extOrigin) return csrfErrorResponse();

  let body: { email?: unknown; category?: unknown; message?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return withCorsHeaders(
      apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다.")),
      extOrigin
    );
  }

  const email = typeof body.email === "string" ? body.email.trim() : "";
  const category = typeof body.category === "string" ? body.category : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!EMAIL_RE.test(email) || email.length > 200) {
    return withCorsHeaders(
      apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "답변받을 이메일 주소를 확인해주세요.")),
      extOrigin
    );
  }
  if (!CATEGORY_SET.has(category)) {
    return withCorsHeaders(
      apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "문의 유형을 선택해주세요.")),
      extOrigin
    );
  }
  if (message.length < 5 || message.length > 2000) {
    return withCorsHeaders(
      apiErrorResponse(new ApiError(400, "SUPPORT_PAYLOAD_INVALID", "문의 내용은 5자 이상 2,000자 이하로 입력해주세요.")),
      extOrigin
    );
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
    return withCorsHeaders(
      apiErrorResponse(
        new ApiError(503, "SUPPORT_UNAVAILABLE", "문의 접수가 일시적으로 어렵습니다. kwan765@naver.com 으로 메일을 보내주세요.")
      ),
      extOrigin
    );
  }

  return withCorsHeaders(Response.json({ ok: true }, { status: 201 }), extOrigin);
}