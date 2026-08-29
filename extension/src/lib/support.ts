/**
 * CS(1:1 문의) 폼 — 팝업에서 ReviewBoost 서버(/api/support)로 문의를 접수한다.
 * 순수 검증 로직은 여기 두고 popup.ts 는 DOM/전송만 담당한다 (테스트 용이).
 */
export const RB_SUPPORT_ENDPOINT = "https://reviewboost.co.kr/api/support";
export const RB_SUPPORT_PAGE = "https://reviewboost.co.kr/support";

export type SupportCategory = "usage" | "bug" | "billing" | "other";

export const SUPPORT_CATEGORIES: ReadonlyArray<{ value: SupportCategory; label: string }> = [
  { value: "usage", label: "사용법 문의" },
  { value: "bug", label: "오류 신고" },
  { value: "billing", label: "결제·계정" },
  { value: "other", label: "기타" }
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** 유효하면 null, 문제가 있으면 사용자에게 보여줄 한국어 오류 메시지. */
export function validateSupportPayload(
  email: string,
  category: string,
  message: string
): string | null {
  if (!SUPPORT_CATEGORIES.some((c) => c.value === category)) {
    return "문의 유형을 선택해주세요.";
  }
  if (!EMAIL_RE.test(email.trim()) || email.trim().length > 200) {
    return "답변받을 이메일 주소를 확인해주세요.";
  }
  const msg = message.trim();
  if (msg.length < 5 || msg.length > 2000) {
    return "문의 내용은 5자 이상 2,000자 이하로 입력해주세요.";
  }
  return null;
}

export interface SupportPayload {
  email: string;
  category: SupportCategory;
  message: string;
}

export function buildSupportRequest(payload: SupportPayload): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  };
}