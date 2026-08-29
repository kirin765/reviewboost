import { describe, expect, it } from "vitest";
import { SUPPORT_CATEGORIES, validateSupportPayload } from "../src/lib/support";

describe("support payload validation", () => {
  it("카테고리 미선택 시 거부", () => {
    expect(validateSupportPayload("a@b.com", "", "문의드립니다 내용입니다.")).toBe("문의 유형을 선택해주세요.");
  });
  it("잘못된 카테고리 거부", () => {
    expect(validateSupportPayload("a@b.com", "spam", "문의드립니다 내용입니다.")).toBe("문의 유형을 선택해주세요.");
  });
  it("이메일 형식 오류 거부", () => {
    expect(validateSupportPayload("bad", "usage", "문의드립니다 내용입니다.")).toContain("이메일");
  });
  it("내용 5자 미만 거부", () => {
    expect(validateSupportPayload("a@b.com", "usage", "안녕")).toBe("문의 내용은 5자 이상 2,000자 이하로 입력해주세요.");
  });
  it("내용 2000자 초과 거부", () => {
    expect(validateSupportPayload("a@b.com", "usage", "가".repeat(2001))).toBe("문의 내용은 5자 이상 2,000자 이하로 입력해주세요.");
  });
  it("정상 입력 통과", () => {
    expect(validateSupportPayload("a@b.com", "bug", "쿠팡 페이지에서 수집이 멈춰요.")).toBeNull();
  });
  it("카테고리 목록이 서버와 일치(usage/bug/billing/other)", () => {
    expect(SUPPORT_CATEGORIES.map((c) => c.value)).toEqual(["usage", "bug", "billing", "other"]);
  });
});