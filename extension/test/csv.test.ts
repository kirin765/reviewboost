import { describe, expect, it } from "vitest";
import { reviewsToCsv } from "../src/lib/csv";
import { SMARTSTORE_REVIEW_HEADERS } from "../src/lib/excel-form";

describe("reviewsToCsv", () => {
  it("emits BOM + the official SmartStore 25-column header", () => {
    const csv = reviewsToCsv([{ text: "좋아요", rating: 5, reviewedAt: "2026-01-15T00:00:00.000Z" }]);
    expect(csv.startsWith(`﻿${SMARTSTORE_REVIEW_HEADERS.join(",")}\r\n`)).toBe(true);
  });

  it("fills the official column positions (rating/text/date) and leaves unknown columns empty", () => {
    const csv = reviewsToCsv([{ text: "좋아요", rating: 5, reviewedAt: "2026-01-15T00:00:00.000Z" }]);
    // 상품번호,상품명,리뷰구분 비움 / 구매자평점=5 / 포토/영상 비움 / 리뷰상세내용 / 도움수·등록자 비움 / 리뷰등록일(KST 공식 표기)
    expect(csv).toContain(",,,5,,좋아요,,,2026.01.15. 09:00:00");
  });

  it("writes the product context into the first two columns", () => {
    const csv = reviewsToCsv([{ text: "좋아요", rating: 5, reviewedAt: null }], {
      productNo: "13089995455",
      productTitle: "테스트 상품"
    });
    expect(csv).toContain("13089995455,테스트 상품,,5,,");
  });

  it("writes image urls into 포토/영상 (newlines flattened to spaces)", () => {
    const csv = reviewsToCsv([
      { text: "사진", rating: 4, reviewedAt: null, imageUrls: ["https://a.com/1.jpg", "https://a.com/2.jpg"] }
    ]);
    expect(csv).toContain("https://a.com/1.jpg https://a.com/2.jpg,사진");
  });

  it("neutralizes CSV formula injection", () => {
    const csv = reviewsToCsv([{ text: "=SUM(A1)", rating: null, reviewedAt: null }]);
    expect(csv).toContain("'=SUM(A1)");
  });

  it("quotes fields with commas/quotes", () => {
    const csv = reviewsToCsv([{ text: 'a,b"c', rating: 4, reviewedAt: null }]);
    expect(csv).toContain('"a,b""c"');
  });
});
