import { describe, expect, it } from "vitest";
import { looksUnusableAsReviewText, parseReviewCsvWithMapping, previewReviewCsv } from "./csv";

describe("looksUnusableAsReviewText", () => {
  it("flags 상품번호/주문번호 style columns", () => {
    expect(looksUnusableAsReviewText(["12883224965", "12017768125", "11816428374"])).toBe(true);
    expect(looksUnusableAsReviewText(["2026.06.19. 17:08:26", "2025.09.22. 13:25:42"])).toBe(true);
    expect(looksUnusableAsReviewText(["", "  "])).toBe(true);
  });

  it("accepts real review sentences, including very short Korean ones", () => {
    expect(
      looksUnusableAsReviewText(["공간이 넓어서 냥이가 자꾸 빠져나옵니다", "여전히 잘 소장중 입니다 감사합니다!"])
    ).toBe(false);
    // 짧다는 이유로 막으면 멀쩡한 리뷰 파일이 통째로 차단된다
    expect(looksUnusableAsReviewText(["좋아요", "만족", "배송빠름"])).toBe(false);
  });
});

describe("csv preview", () => {
  it("parses headered CSV and infers text/rating/date columns", () => {
    const csv = ["review,rating,review_date", "좋아요,5,2026-01-01", "별로다,2,2026-01-02"].join("\n");
    const result = previewReviewCsv(csv, "reviews.csv");

    expect(result.headerMode).toBe("header");
    expect(result.filename).toBe("reviews.csv");
    expect(result.totalRows).toBe(2);
    expect(result.columns).toEqual(["review", "rating", "review_date"]);
    expect(result.inferred.textCol).toBe("review");
    expect(result.inferred.ratingCol).toBe("rating");
    expect(result.inferred.dateCol).toBe("review_date");
  });

  it("detects semicolon delimiter and returns warning", () => {
    const csv = ["review;rating;review_date", "좋아요;5;2026-01-01"].join("\n");
    const result = previewReviewCsv(csv, "reviews.csv");

    expect(result.headerMode).toBe("header");
    expect(result.warnings.some((item) => item.includes("구분자"))).toBe(true);
    expect(result.columns).toEqual(["review", "rating", "review_date"]);
  });

  it("falls back to headerless mode when first row looks like data", () => {
    const csv = ["\"고객 리뷰가 있는 첫 번째 데이터 라인입니다\",5,2026-01-01", "별로다,1,2026-01-02"].join("\n");
    const result = previewReviewCsv(csv);

    expect(result.headerMode).toBe("headerless");
    expect(result.columns).toEqual(["col1", "col2", "col3"]);
    expect(result.inferred.textCol).toBe("col1");
  });

  it("returns empty result for empty content", () => {
    const result = previewReviewCsv("");

    expect(result.totalRows).toBe(0);
    expect(result.warnings).toContain("CSV에 데이터가 없습니다.");
    expect(result.columns).toEqual([]);
  });

  // 2026-07-28 첫 유료 고객이 이 형식을 올렸고, 상품번호 열이 리뷰 본문으로 분석됐다.
  it("maps 스마트스토어 리뷰 다운로드 headers instead of falling back to column 1", () => {
    const header = [
      "상품번호", "상품명", "리뷰구분", "구매자평점", "포토/영상", "리뷰상세내용", "리뷰도움수",
      "등록자", "리뷰등록일", "최종수정일", "리뷰글번호", "관련리뷰글번호", "관련리뷰상세내용",
      "전시상태", "답글여부", "답글등록일시", "베스트리뷰", "베스트리뷰선정일시", "이벤트번호",
      "혜택지급", "혜택지급일시", "유저정보 등록 항목", "상품주문번호", "풀필먼트사", "리뷰이동일"
    ].join(",");
    const row = [
      "12883224965", "고양이 발톱깎기 앞치마", "한달사용", "4", "", "공간이 넓어서 냥이가 자꾸 빠져나옵니다", "",
      "kweo***", "2026.06.19. 17:08:26", "", "5002323915", "4978174773", "야옹이가 쏙들어가서 작업하기 좋아요",
      "정상", "N", "", "N", "", "", "", "", "", "2026050182911941", "", ""
    ].join(",");

    const result = previewReviewCsv([header, row].join("\n"), "review_20260808.csv");

    expect(result.headerMode).toBe("header");
    expect(result.inferred.textCol).toBe("리뷰상세내용");
    expect(result.inferred.ratingCol).toBe("구매자평점");
    expect(result.inferred.dateCol).toBe("리뷰등록일");

    const rows = parseReviewCsvWithMapping([header, row].join("\n"), result.inferred);
    expect(rows[0]?.text).toBe("공간이 넓어서 냥이가 자꾸 빠져나옵니다");
    expect(rows[0]?.rating).toBe(4);
  });
});

describe("rating parsing", () => {
  it("parses Korean rating formats like 5점 and ★5", () => {
    const csv = ["review,rating", "만족스러운 상품입니다,5점", "별로였습니다,★1", "그저 그래요,3.5점"].join("\n");
    const rows = parseReviewCsvWithMapping(csv);
    expect(rows.map((r) => r.rating)).toEqual([5, 1, 3.5]);
  });

  // 스마트스토어는 날짜 뒤에 점을 하나 더 붙인다. 놓치면 최근성 분석이 통째로 빈다.
  it("parses 스마트스토어 date format with a trailing dot", () => {
    const csv = [
      "리뷰상세내용,구매자평점,리뷰등록일",
      "공간이 넓어서 냥이가 자꾸 빠져나옵니다,4,2026.06.19. 17:08:26",
      "여전히 잘 소장중 입니다 감사합니다!,5,2025.09.22. 13:25:42"
    ].join("\n");
    const rows = parseReviewCsvWithMapping(csv);

    expect(rows.map((r) => r.reviewedAt?.slice(0, 10))).toEqual(["2026-06-19", "2025-09-22"]);
  });

  it("keeps parsing the date formats that already worked", () => {
    const csv = [
      "review,rating,review_date",
      "좋아요,5,2026-01-02",
      "괜찮아요,4,2026/01/03",
      "무난해요,3,2026-01-04T05:06:07Z"
    ].join("\n");
    const rows = parseReviewCsvWithMapping(csv);

    expect(rows.map((r) => r.reviewedAt?.slice(0, 10))).toEqual(["2026-01-02", "2026-01-03", "2026-01-04"]);
  });

  // xlsx는 날짜 셀을 일련번호로 저장한다. 문자열 파싱만 하면 최근성 분석이 통째로 빈다.
  it("parses Excel date serial numbers from xlsx uploads", () => {
    const csv = ["review,rating,review_date", "좋아요,5,46192", "괜찮아요,4,45000"].join("\n");
    const rows = parseReviewCsvWithMapping(csv);

    expect(rows.map((r) => r.reviewedAt?.slice(0, 10))).toEqual(["2026-06-19", "2023-03-15"]);
  });

  it("does not mistake a plain number column for a date", () => {
    const csv = ["review,rating,review_date", "좋아요,5,3", "괜찮아요,4,999999"].join("\n");
    const rows = parseReviewCsvWithMapping(csv);

    expect(rows.map((r) => r.reviewedAt)).toEqual([null, null]);
  });

  it("still rejects non-numeric ratings", () => {
    const csv = ["review,rating", "만족스러운 상품입니다,좋음"].join("\n");
    const rows = parseReviewCsvWithMapping(csv);
    expect(rows[0]?.rating).toBeNull();
  });
});
