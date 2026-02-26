import { describe, expect, it } from "vitest";
import type { AnalysisOutput } from "./types";

describe("contract smoke", () => {
  it("analysis output includes minimum required contract fields", () => {
    const analysis: AnalysisOutput = {
      stats: {
        total: 1,
        positive: 1,
        negative: 0,
        neutral: 0,
        positiveRatio: 1,
        negativeRatio: 0,
        avgRating: 4.5,
        negativeKeywordsTop10: [],
        categoryCounts: {
          배송: 0,
          품질: 0,
          가격: 0,
          사용성: 0,
          CS: 0,
          기타: 0
        },
        priorityScore: 10.2,
        recentness: {
          hasDates: false,
          last30Share: 0,
          last90Share: 0,
          last30NegativeRatio: null
        }
      },
      suggestions: {
        detailPageCopy: ["d1", "d2", "d3"],
        csResponseTemplates: ["c1", "c2"],
        faqRecommendations: ["f1", "f2", "f3"],
        notes: ["n1"]
      },
      classified: [
        {
          text: "좋아요",
          rating: 5,
          reviewedAt: "2026-01-01T00:00:00.000Z",
          sentiment: "positive",
          category: "품질"
        }
      ]
    };

    expect(analysis.stats.total).toBe(1);
    expect(analysis.suggestions.detailPageCopy).toHaveLength(3);
    expect(analysis.classified[0]).toMatchObject({ sentiment: "positive", category: "품질" });
  });

  it("report success/fail headers are well-formed", () => {
    const success = new Headers({
      "content-type": "application/pdf",
      "content-disposition": 'attachment; filename="review-report.pdf"',
      "cache-control": "public, max-age=0",
      "x-report-renderer": "puppeteer"
    });
    const fail = new Headers({
      "content-type": "application/json",
      "content-disposition": "inline",
      "cache-control": "no-store",
      "x-report-renderer": "puppeteer",
      "x-puppeteer-error": "render timeout"
    });

    expect(success.get("content-disposition")).toContain("attachment");
    expect(fail.get("x-puppeteer-error")).toBe("render timeout");
  });
});
