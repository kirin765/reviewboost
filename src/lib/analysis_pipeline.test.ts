import { describe, expect, it, vi } from "vitest";
import { runAnalysisPipeline } from "./analysis_pipeline";

const openAi = vi.hoisted(() => ({
  classifyReviewsWithOpenAI: vi.fn(),
  generateSuggestions: vi.fn()
}));

vi.mock("./openai_classify", () => ({
  classifyReviewsWithOpenAI: openAi.classifyReviewsWithOpenAI
}));

vi.mock("./openai_suggestions", () => ({
  generateSuggestions: openAi.generateSuggestions
}));

describe("runAnalysisPipeline", () => {
  const baseCsv = ["review,rating,reviewed_at", "좋아요,5,2026-01-01", "배송이 느려요,2,2026-01-01"].join("\n");

  it("기본 히유리스틱 경로를 안정적으로 수행한다", async () => {
    openAi.generateSuggestions.mockResolvedValue({
      detailPageCopy: ["d1", "d2", "d3"],
      csResponseTemplates: ["c1", "c2"],
      faqRecommendations: ["f1", "f2", "f3"],
      notes: ["n1"]
    });

    const result = await runAnalysisPipeline({
      csvText: baseCsv,
      headerMode: "header",
      textCol: null,
      ratingCol: null,
      dateCol: null,
      plan: "free",
      useLLM: false
    });

    expect(result.payload.meta.stored).toBe(false);
    expect(result.payload.meta.truncated).toBe(false);
    expect(result.payload.classified.length).toBe(2);
    expect(result.payload.stats.total).toBe(2);
    expect(result.payload.stats.negative).toBeGreaterThanOrEqual(0);
    expect(openAi.classifyReviewsWithOpenAI).not.toHaveBeenCalled();
    expect(openAi.generateSuggestions).toHaveBeenCalled();
  });

  it("applies LLM 결과를 target 인덱스에 반영한다", async () => {
    openAi.classifyReviewsWithOpenAI.mockResolvedValue([
      { sentiment: "positive", category: "품질" },
      { sentiment: "negative", category: "배송" }
    ]);
    openAi.generateSuggestions.mockResolvedValue({
      detailPageCopy: ["d1", "d2", "d3"],
      csResponseTemplates: ["c1", "c2"],
      faqRecommendations: ["f1", "f2", "f3"],
      notes: ["n1"]
    });

    const result = await runAnalysisPipeline({
      csvText: baseCsv,
      headerMode: "header",
      textCol: null,
      ratingCol: null,
      dateCol: null,
      plan: "basic",
      useLLM: true
    });

    expect(openAi.classifyReviewsWithOpenAI).toHaveBeenCalled();
    expect(result.payload.classified[0]).toMatchObject({ sentiment: "positive", category: "품질" });
    expect(openAi.generateSuggestions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useAiNarrative: true }));
  });

  it("시간 예산이 부족하면 제안 생성은 템플릿 경로로 fallback한다", async () => {
    openAi.classifyReviewsWithOpenAI.mockResolvedValue([
      { sentiment: "positive", category: "품질" },
      { sentiment: "negative", category: "배송" }
    ]);
    openAi.generateSuggestions.mockResolvedValue({
      detailPageCopy: ["d1", "d2", "d3"],
      csResponseTemplates: ["c1", "c2"],
      faqRecommendations: ["f1", "f2", "f3"],
      notes: ["n1"]
    });

    const result = await runAnalysisPipeline({
      csvText: baseCsv,
      headerMode: "header",
      textCol: null,
      ratingCol: null,
      dateCol: null,
      plan: "pro",
      useLLM: true,
      startedAtMs: Date.now() - 1_000,
      timeBudgetMs: 2_000
    });

    expect(openAi.generateSuggestions).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ useAiNarrative: false })
    );
    expect(result.payload.meta.aiFallbackReason).toBe("time_budget_exhausted");
    expect(result.payload.meta.llmApplied).toBe(false);
  });

  it("LLM length mismatch면 휴리스틱을 유지한다", async () => {
    openAi.classifyReviewsWithOpenAI.mockResolvedValue([
      { sentiment: "positive", category: "품질" }
    ]);
    openAi.generateSuggestions.mockResolvedValue({
      detailPageCopy: ["d1", "d2", "d3"],
      csResponseTemplates: ["c1", "c2"],
      faqRecommendations: ["f1", "f2", "f3"],
      notes: ["n1"]
    });

    const result = await runAnalysisPipeline({
      csvText: baseCsv,
      headerMode: "header",
      textCol: null,
      ratingCol: null,
      dateCol: null,
      plan: "basic",
      useLLM: true
    });

    expect(openAi.classifyReviewsWithOpenAI).toHaveBeenCalled();
    expect(openAi.generateSuggestions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useAiNarrative: false }));
    expect(result.payload.stats.total).toBe(2);
    expect(openAi.generateSuggestions).toHaveBeenCalled();
  });
});
