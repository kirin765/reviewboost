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
    openAi.classifyReviewsWithOpenAI.mockResolvedValue({
      requestedCount: 2,
      appliedCount: 2,
      failedBatchCount: 0,
      classifications: [
        { sentiment: "positive", category: "가격" },
        { sentiment: "negative", category: "CS" }
      ]
    });
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
    expect(result.payload.classified[0]).toMatchObject({ sentiment: "positive", category: "가격" });
    expect(openAi.generateSuggestions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useAiNarrative: true }));
  });

  it("시간 예산이 부족하면 제안 생성은 템플릿 경로로 fallback한다", async () => {
    openAi.classifyReviewsWithOpenAI.mockResolvedValue({
      requestedCount: 2,
      appliedCount: 2,
      failedBatchCount: 0,
      classifications: [
        { sentiment: "positive", category: "품질" },
        { sentiment: "negative", category: "배송" }
      ]
    });
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

  it("LLM 일부 실패가 있어도 나머지는 반영하고 휴리스틱을 유지한다", async () => {
    openAi.classifyReviewsWithOpenAI.mockResolvedValue({
      requestedCount: 2,
      appliedCount: 1,
      failedBatchCount: 1,
      classifications: [
        { sentiment: "positive", category: "품질" },
        { sentiment: "negative", category: "배송" }
      ]
    });
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
    expect(result.payload.classified).toHaveLength(2);
    expect(result.payload.classified[0]).toMatchObject({ sentiment: "positive", category: "품질" });
    expect(openAi.generateSuggestions).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ useAiNarrative: true }));
    expect(result.payload.stats.total).toBe(2);
    expect(openAi.generateSuggestions).toHaveBeenCalled();
  });

  it("스마트스토어 공식 폼 업로드 시 검수·리서치(smartstore)를 채운다", async () => {
    openAi.generateSuggestions.mockResolvedValue({
      detailPageCopy: ["d1"],
      csResponseTemplates: ["c1"],
      faqRecommendations: ["f1"],
      notes: ["n1"]
    });

    const header = [
      "상품번호", "상품명", "리뷰구분", "구매자평점", "포토/영상", "리뷰상세내용", "리뷰도움수",
      "등록자", "리뷰등록일", "최종수정일", "리뷰글번호", "관련리뷰글번호", "관련리뷰상세내용",
      "전시상태", "답글여부", "답글등록일시", "베스트리뷰", "베스트리뷰선정일시", "이벤트번호",
      "혜택지급", "혜택지급일시", "유저정보 등록 항목", "상품주문번호", "풀필먼트사", "리뷰이동일"
    ].join(",");
    const rows = [
      ["12883224965", "강아지 배변패드", "", "1", "", "배송이 너무 늦었어요", "5", "kweo***", "2026.06.19. 17:08:26", "", "", "", "", "정상", "N", "", "N", "", "", "", "", "", "", "", ""].join(","),
      ["12883224965", "강아지 배변패드", "", "5", "https://phinf.pstatic.net/a.jpg", "사진이 잘 나옵니다", "12", "abc***", "2026.06.20. 09:12:00", "", "", "", "", "정상", "Y", "", "Y", "", "", "", "", "", "", "", ""].join(",")
    ].join("\n");

    const result = await runAnalysisPipeline({
      csvText: [header, rows].join("\n"),
      headerMode: "header",
      // 프로덕션 흐름처럼 UI가 선택한 공식 열을 넘긴다(스마트스토어 폼 자동 매핑 결과).
      textCol: "리뷰상세내용",
      ratingCol: "구매자평점",
      dateCol: "리뷰등록일",
      plan: "free",
      useLLM: false
    });

    expect(result.payload.smartstore).not.toBeNull();
    expect(result.payload.smartstore!.unrepliedNegativeCount).toBe(1);
    expect(result.payload.smartstore!.unrepliedNegative[0]!.review.text).toBe("배송이 너무 늦었어요");
    expect(result.payload.smartstore!.photoReviewCount).toBe(1);
    expect(result.payload.smartstore!.totalHelpful).toBe(17);
    expect(result.payload.smartstore!.productStats[0]!.avgRating).toBe(3);
  });

  it("일반 업로드는 smartstore 인사이트 없이 null을 유지한다", async () => {
    openAi.generateSuggestions.mockResolvedValue({
      detailPageCopy: ["d1"],
      csResponseTemplates: ["c1"],
      faqRecommendations: ["f1"],
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

    expect(result.payload.smartstore).toBeNull();
  });
});
