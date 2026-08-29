import { describe, expect, it } from "vitest";
import {
  isSmartstoreReviewForm,
  mapSmartstoreColumns,
  matchSmartstoreHeaders,
  SMARTSTORE_REVIEW_HEADERS,
  toYnOrNull
} from "./smartstore_form";

const OFFICIAL_HEADERS = [...SMARTSTORE_REVIEW_HEADERS];

describe("smartstore form detection", () => {
  it("detects the official 25-column review export form", () => {
    expect(isSmartstoreReviewForm(OFFICIAL_HEADERS)).toBe(true);
    expect(matchSmartstoreHeaders(OFFICIAL_HEADERS).length).toBe(25);
  });

  it("detects partial exports as long as the core columns remain", () => {
    const partial = [
      "상품번호",
      "상품명",
      "구매자평점",
      "포토/영상",
      "리뷰상세내용",
      "등록자",
      "리뷰등록일",
      "최종수정일",
      "답글여부",
      "베스트리뷰"
    ];
    expect(isSmartstoreReviewForm(partial)).toBe(true);
  });

  it("rejects generic review files with few official headers", () => {
    expect(isSmartstoreReviewForm(["review", "rating", "review_date"])).toBe(false);
    // 리뷰상세내용·구매자평점이 없으면 공식 폼으로 보지 않는다.
    expect(isSmartstoreReviewForm(["상품번호", "상품명", "리뷰구분", "전시상태", "답글여부", "베스트리뷰", "상품주문번호", "리뷰이동일"])).toBe(false);
  });

  it("maps official column names to the smartstore field map", () => {
    const map = mapSmartstoreColumns(OFFICIAL_HEADERS);
    expect(map).not.toBeNull();
    expect(map!.text).toBe("리뷰상세내용");
    expect(map!.rating).toBe("구매자평점");
    expect(map!.date).toBe("리뷰등록일");
    expect(map!.author).toBe("등록자");
    expect(map!.photo).toBe("포토/영상");
    expect(map!.helpful).toBe("리뷰도움수");
    expect(map!.reply).toBe("답글여부");
    expect(map!.best).toBe("베스트리뷰");
    expect(map!.productName).toBe("상품명");
    expect(map!.productNo).toBe("상품번호");
  });

  it("returns null mapping for non-smartstore files", () => {
    expect(mapSmartstoreColumns(["review", "rating"])).toBeNull();
  });
});

describe("toYnOrNull", () => {
  it("normalizes Y/N variants used in official exports", () => {
    expect(toYnOrNull("Y")).toBe("Y");
    expect(toYnOrNull("y")).toBe("Y");
    expect(toYnOrNull("예")).toBe("Y");
    expect(toYnOrNull("1")).toBe("Y");
    expect(toYnOrNull("N")).toBe("N");
    expect(toYnOrNull("아니오")).toBe("N");
    expect(toYnOrNull("0")).toBe("N");
  });

  it("returns null for empty/unknown values", () => {
    expect(toYnOrNull("")).toBeNull();
    expect(toYnOrNull("-")).toBeNull();
    expect(toYnOrNull("https://phinf.pstatic.net/...")).toBeNull();
  });
});