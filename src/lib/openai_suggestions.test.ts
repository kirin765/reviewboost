import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AnalysisStats } from "./types";
import { generateSuggestions } from "./openai_suggestions";

const openAiCreate = vi.hoisted(() => vi.fn());
const openAiClient = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: vi.fn((options) => {
    openAiClient(options);
    return {
      chat: {
        completions: {
          create: openAiCreate
        }
      }
    };
  })
}));

function sampleStats(): AnalysisStats {
  return {
    total: 2,
    positive: 1,
    negative: 1,
    neutral: 0,
    positiveRatio: 0.5,
    negativeRatio: 0.5,
    avgRating: 3.4,
    negativeKeywordsTop10: [{ keyword: "배송", count: 2 }],
    categoryCounts: {
      배송: 1,
      품질: 0,
      가격: 0,
      사용성: 0,
      CS: 1,
      기타: 0
    },
    priorityScore: 40,
    recentness: {
      hasDates: true,
      last30Share: 1,
      last90Share: 1,
      last30NegativeRatio: 0.5
    }
  };
}

describe("generateSuggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = "test-key";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_SUGGEST_TIMEOUT_MS;
  });

  it("fallback 템플릿 when OpenAI key is missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const result = await generateSuggestions(sampleStats());

    expect(result.detailPageCopy.length).toBeGreaterThan(0);
    expect(result.csResponseTemplates.length).toBeGreaterThan(0);
    expect(result.faqRecommendations.length).toBeGreaterThan(0);
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it("falls back when response format is invalid", async () => {
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: "{bad-json" } }]
    } as never);

    const result = await generateSuggestions(sampleStats(), { useAiNarrative: true });

    expect(openAiCreate).toHaveBeenCalled();
    expect(result.detailPageCopy[0]).toBeTruthy();
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("uses OPENAI_SUGGEST_TIMEOUT_MS when provided", async () => {
    process.env.OPENAI_SUGGEST_TIMEOUT_MS = "9000";
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        detailPageCopy: ["d1", "d2", "d3", "d4", "d5", "d6"],
        csResponseTemplates: ["c1", "c2", "c3", "c4"],
        faqRecommendations: ["f1", "f2", "f3", "f4", "f5", "f6"],
        notes: ["n1", "n2"]
      }) } }]
    } as never);

    const result = await generateSuggestions(sampleStats(), { useAiNarrative: true });
    const calls = openAiCreate.mock.calls;
    const options = calls[0]?.[1];

    expect(result.notes).toContain("n1");
    expect(options).toMatchObject({ timeout: 9000 });
  });

  it("creates OpenAI client with maxRetries 0", async () => {
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({
        detailPageCopy: ["d1", "d2", "d3", "d4", "d5", "d6"],
        csResponseTemplates: ["c1", "c2", "c3", "c4"],
        faqRecommendations: ["f1", "f2", "f3", "f4", "f5", "f6"],
        notes: ["n1", "n2"]
      }) } }]
    } as never);

    await generateSuggestions(sampleStats(), { useAiNarrative: true });

    expect(openAiClient).toHaveBeenCalledWith({ apiKey: "test-key", maxRetries: 0 });
  });

  it("falls back immediately when suggestion time budget is not enough", async () => {
    const result = await generateSuggestions(sampleStats(), {
      useAiNarrative: true,
      timeBudgetMs: 500
    });

    expect(openAiCreate).not.toHaveBeenCalled();
    expect(result.detailPageCopy.length).toBeGreaterThan(0);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});
