import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { classifyReviewsWithOpenAI } from "./openai_classify";

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

describe("classifyReviewsWithOpenAI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_CLASSIFY_BATCH_SIZE = "60";
    process.env.OPENAI_CLASSIFY_TIMEOUT_MS = "12000";
    process.env.OPENAI_CLASSIFY_MAX_CONCURRENCY = "2";
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

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      requestedCount: 1,
      appliedCount: 0,
      failedBatchCount: 1,
      classifications: [{ sentiment: "neutral", category: "기타" }]
    });
  });

  it("maps batch results by id and keeps fallback when items 필드가 없으면", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ not: "items" }) } }]
    } as never);

    const result = await classifyReviewsWithOpenAI({ texts: ["리뷰1", "리뷰2"] });

    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      requestedCount: 2,
      appliedCount: 0,
      failedBatchCount: 1,
      classifications: [
        { sentiment: "neutral", category: "기타" },
        { sentiment: "neutral", category: "기타" }
      ]
    });
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
    expect(result).toMatchObject({
      requestedCount: 2,
      appliedCount: 1,
      failedBatchCount: 0,
      classifications: [
        { sentiment: "positive", category: "품질" },
        { sentiment: "neutral", category: "기타" }
      ]
    });
  });

  it("creates OpenAI client with maxRetries 0", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    openAiCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ items: [{ id: 0, sentiment: "positive", category: "품질" }] }) } }]
    } as never);

    await classifyReviewsWithOpenAI({ texts: ["리뷰"] });

    expect(openAiClient).toHaveBeenCalledWith({ apiKey: "test-key", maxRetries: 0 });
  });

  it("preserves output order with bounded parallel batches", async () => {
    process.env.OPENAI_API_KEY = "test-key";
    process.env.OPENAI_CLASSIFY_BATCH_SIZE = "2";
    openAiCreate.mockImplementation(async (payload: { messages: Array<{ content: string }>; [key: string]: unknown }) => {
      const rawContent = payload.messages?.[0]?.content;
      const marker = rawContent?.split("\n").at(-1);
      const parsed = marker ? JSON.parse(marker) : null;
      const items = (Array.isArray(parsed?.items) ? parsed.items : []) as Array<{ id: number }>;
      return {
        choices: [
          {
            message: {
              content: JSON.stringify({
                items: items.map((item) => ({
                  id: item.id,
                  sentiment: "positive",
                  category: "품질"
                }))
              })
            }
          }
        ]
      } as never;
    });

    const result = await classifyReviewsWithOpenAI({
      texts: ["첫번째", "두번째", "세번째", "네번째", "다섯번째"]
    });

    expect(openAiCreate).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({
      requestedCount: 5,
      appliedCount: 5,
      failedBatchCount: 0,
      classifications: [
        { sentiment: "positive", category: "품질" },
        { sentiment: "positive", category: "품질" },
        { sentiment: "positive", category: "품질" },
        { sentiment: "positive", category: "품질" },
        { sentiment: "positive", category: "품질" }
      ]
    });
  });
});
