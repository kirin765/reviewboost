import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyReviewsWithOpenAI } from "./openai_classify";

const openAiCreate = vi.hoisted(() => vi.fn());

vi.mock("openai", () => ({
  default: vi.fn(() => ({
    chat: {
      completions: {
        create: openAiCreate
      }
    }
  }))
}));

describe("classifyReviewsWithOpenAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("returns null when API key is missing", async () => {
    const result = await classifyReviewsWithOpenAI({ texts: ["좋아요"] });

    expect(result).toBeNull();
    expect(openAiCreate).not.toHaveBeenCalled();
  });

  it("returns null when OpenAI 응답 JSON이 파싱되지 않으면", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: "{invalid-json" } }]
    } as never);

    const result = await classifyReviewsWithOpenAI({ texts: ["리뷰"] });

    expect(result).toBeNull();
  });

  it("maps batch results by id and keeps fallback when items 필드가 없으면", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ not: "items" }) } }]
    } as never);

    const result = await classifyReviewsWithOpenAI({ texts: ["리뷰1", "리뷰2"] });

    expect(result).toBeNull();
  });

  it("returns parsed 분류 결과 when response is valid", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_CLASSIFY_BATCH_SIZE = "1";
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ items: [{ id: 0, sentiment: "positive", category: "품질" }] }) } }]
    } as never);

    const result = await classifyReviewsWithOpenAI({
      texts: ["좋아요", "최악"]
    });

    expect(openAiCreate).toHaveBeenCalledTimes(2);
    expect(result).toEqual([
      { sentiment: "positive", category: "품질" },
      { sentiment: "neutral", category: "기타" }
    ]);
  });
});
