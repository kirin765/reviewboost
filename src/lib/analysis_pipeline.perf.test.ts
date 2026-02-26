import { describe, expect, it, vi } from "vitest";
import { runAnalysisPipeline } from "./analysis_pipeline";

const openAiMock = vi.hoisted(() => ({
  classifyReviewsWithOpenAI: vi.fn(),
  generateSuggestions: vi.fn()
}));

vi.mock("./openai_classify", () => ({
  classifyReviewsWithOpenAI: openAiMock.classifyReviewsWithOpenAI
}));

vi.mock("./openai_suggestions", () => ({
  generateSuggestions: openAiMock.generateSuggestions
}));

describe("analysis pipeline performance baseline", () => {
  it("handles 10k+ rows within a bounded execution window", async () => {
    const totalRows = 10000;
    const rows = Array.from({ length: totalRows }, (_, idx) => {
      const rating = (idx % 5) + 1;
      const text = idx % 3 === 0 ? "배송이 좀 늦었어요" : `리뷰 ${idx}번째 내용입니다`;
      return `${text},${rating},2026-01-${String((idx % 28) + 1).padStart(2, "0")}`;
    });

    openAiMock.generateSuggestions.mockResolvedValue({
      detailPageCopy: ["d1", "d2", "d3"],
      csResponseTemplates: ["c1", "c2"],
      faqRecommendations: ["f1", "f2", "f3"],
      notes: ["n1"]
    });

    openAiMock.classifyReviewsWithOpenAI.mockResolvedValue(null);

    const csvText = ["review_text,rating,review_date", ...rows].join("\n");
    const startMemory = process.memoryUsage().heapUsed;
    const started = performance.now();

    const result = await runAnalysisPipeline({
      csvText,
      headerMode: "header",
      textCol: null,
      ratingCol: null,
      dateCol: null,
      plan: "basic",
      useLLM: false
    });

    const elapsed = performance.now() - started;
    const memoryDeltaMb = (process.memoryUsage().heapUsed - startMemory) / (1024 * 1024);
    console.log(`[CI] 10k rows pipeline ms=${Math.round(elapsed)}`);
    console.log(`[CI] 10k rows pipeline memoryDeltaMB=${memoryDeltaMb.toFixed(2)}`);
    expect(memoryDeltaMb).toBeLessThan(512);

    expect(result.payload.classified.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(25000);
  }, 30000);
});
