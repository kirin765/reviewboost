import { describe, expect, it } from "vitest";
import {
  formatOfficialDate,
  reviewToOfficialRow,
  SMARTSTORE_REVIEW_HEADERS
} from "../src/lib/excel-form";

describe("SMARTSTORE_REVIEW_HEADERS", () => {
  it("matches the official SmartStore seller-center export column order", () => {
    expect(SMARTSTORE_REVIEW_HEADERS).toEqual([
      "상품번호",
      "상품명",
      "리뷰구분",
      "구매자평점",
      "포토/영상",
      "리뷰상세내용",
      "리뷰도움수",
      "등록자",
      "리뷰등록일",
      "최종수정일",
      "리뷰글번호",
      "관련리뷰글번호",
      "관련리뷰상세내용",
      "전시상태",
      "답글여부",
      "답글등록일시",
      "베스트리뷰",
      "베스트리뷰선정일시",
      "이벤트번호",
      "혜택지급",
      "혜택지급일시",
      "유저정보 등록 항목",
      "상품주문번호",
      "풀필먼트사",
      "리뷰이동일"
    ]);
  });
});

describe("formatOfficialDate", () => {
  it("formats ISO to the official 'YYYY.MM.DD. HH:mm:ss' in KST", () => {
    // 2026-01-15T00:00:00Z 는 KST 09:00
    expect(formatOfficialDate("2026-01-15T00:00:00.000Z")).toBe("2026.01.15. 09:00:00");
  });
  it("returns empty for null/empty/invalid", () => {
    expect(formatOfficialDate(null)).toBe("");
    expect(formatOfficialDate(undefined)).toBe("");
    expect(formatOfficialDate("")).toBe("");
    expect(formatOfficialDate("garbage")).toBe("");
  });
});

describe("reviewToOfficialRow", () => {
  it("fills the known review columns in the official order", () => {
    const row = reviewToOfficialRow(
      {
        text: "좋아요",
        rating: 4,
        reviewedAt: "2026-01-15T00:00:00.000Z",
        author: "철수",
        helpfulCount: 2,
        imageUrls: ["https://a.com/1.jpg"]
      },
      { productNo: "13089995455", productTitle: "테스트 상품" }
    );
    expect(row).toHaveLength(25);
    expect(row).toEqual([
      "13089995455",
      "테스트 상품",
      "",
      "4",
      "https://a.com/1.jpg",
      "좋아요",
      "2",
      "철수",
      "2026.01.15. 09:00:00",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ]);
  });

  it("keeps unknown columns empty and omits empty optional fields", () => {
    const row = reviewToOfficialRow({ text: "텍스트만", rating: null, reviewedAt: null });
    expect(row[3]).toBe("");
    expect(row[6]).toBe("");
    expect(row[7]).toBe("");
    expect(row[8]).toBe("");
  });
});
