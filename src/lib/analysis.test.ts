import { describe, expect, it } from "vitest";
import { analyzeReviews, classifyHeuristic, computeAnalysisFromClassified } from "./analysis";
import type { ClassifiedReview, ReviewRow } from "@/lib/types";

describe("classifyHeuristic", () => {
  it("derives sentiment from rating when present", () => {
    const rows: ReviewRow[] = [
      { text: "배송이 빨라요", rating: 5 },
      { text: "그냥 그래요", rating: 3 },
      { text: "포장이 파손됐어요", rating: 1 }
    ];
    const out = classifyHeuristic(rows);
    expect(out.map((r) => r.sentiment)).toEqual(["positive", "neutral", "negative"]);
  });

  it("falls back to text hints when rating is null", () => {
    const rows: ReviewRow[] = [
      { text: "정말 만족합니다", rating: null },
      { text: "불량이 왔어요", rating: null },
      { text: "평범한 상품", rating: null }
    ];
    expect(classifyHeuristic(rows).map((r) => r.sentiment)).toEqual(["positive", "negative", "neutral"]);
  });

  it("categorises by keyword and drops empty text", () => {
    const rows: ReviewRow[] = [
      { text: "택배가 늦게 도착했어요", rating: 2 },
      { text: "고객센터 응대가 별로였어요", rating: 2 },
      { text: "   ", rating: 5 }
    ];
    const out = classifyHeuristic(rows);
    expect(out).toHaveLength(2);
    expect(out[0]?.category).toBe("배송");
    expect(out[1]?.category).toBe("CS");
  });

  it("does not categorise 새 상품/새벽 mentions as 품질", () => {
    const out = classifyHeuristic([
      { text: "새 상품이라 좋아요", rating: 5 },
      { text: "냄새가 심하게 나요", rating: 2 }
    ]);
    expect(out[0]?.category).toBe("기타");
    expect(out[1]?.category).toBe("품질");
  });
});

describe("computeAnalysisFromClassified", () => {
  const classified: ClassifiedReview[] = [
    { text: "좋아요", rating: 5, sentiment: "positive", category: "품질" },
    { text: "괜찮아요", rating: 3, sentiment: "neutral", category: "기타" },
    { text: "불량", rating: 1, sentiment: "negative", category: "품질" },
    { text: "지연", rating: 2, sentiment: "negative", category: "배송" }
  ];

  it("computes counts, ratios and average rating", () => {
    const { stats } = computeAnalysisFromClassified(classified);
    expect(stats.total).toBe(4);
    expect(stats.positive).toBe(1);
    expect(stats.negative).toBe(2);
    expect(stats.neutral).toBe(1);
    expect(stats.negativeRatio).toBeCloseTo(0.5);
    expect(stats.avgRating).toBeCloseTo((5 + 3 + 1 + 2) / 4);
    expect(stats.categoryCounts.품질).toBe(2);
  });

  it("returns null average when no numeric ratings exist", () => {
    const noRatings: ClassifiedReview[] = [
      { text: "좋아요", rating: null, sentiment: "positive", category: "품질" }
    ];
    expect(computeAnalysisFromClassified(noRatings).stats.avgRating).toBeNull();
  });

  it("produces a priority score within 0-100", () => {
    const { stats } = computeAnalysisFromClassified(classified);
    expect(stats.priorityScore).toBeGreaterThanOrEqual(0);
    expect(stats.priorityScore).toBeLessThanOrEqual(100);
  });

  it("reports no dates when reviews lack timestamps", () => {
    const { stats } = computeAnalysisFromClassified(classified);
    expect(stats.recentness?.hasDates).toBe(false);
  });
});

describe("analyzeReviews", () => {
  it("runs the full heuristic pipeline end to end", () => {
    const out = analyzeReviews([
      { text: "배송이 너무 늦어요", rating: 1 },
      { text: "품질 최고예요", rating: 5 }
    ]);
    expect(out.stats.total).toBe(2);
    expect(out.classified).toHaveLength(2);
    expect(out.suggestions.detailPageCopy).toEqual([]);
  });
});
