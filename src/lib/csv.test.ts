import { describe, expect, it } from "vitest";
import { previewReviewCsv } from "./csv";

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
});
