import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyReviewsWithTypeSafe } from "./typesafe_classify";
import { getCapabilitiesBase } from "./capabilities";

const sentiments = ["positive", "neutral", "negative"];
const categories = ["배송", "품질", "가격", "사용성", "CS", "기타"];
function answer(choice: string, keys: string[], confidence = 0.95) {
  return { type: "choice", choice, confidence, probabilities: Object.fromEntries(keys.map(k => [k, k === choice ? 1 : 0])) };
}
function response(count: number) {
  return Response.json({ answers: Object.fromEntries(Array.from({ length: count }, (_, i) => [
    [`sentiment_${i}`, answer("negative", sentiments)],
    [`category_${i}`, answer("배송", categories)]
  ]).flat()) });
}
const fallback = { sentiment: "positive" as const, category: "기타" as const };
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("TypeSafe review classification", () => {
  it("skips unconfigured calls and advertises TypeSafe-only availability", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await classifyReviewsWithTypeSafe({ texts: ["좋아요"] })).toBeNull();
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    vi.stubEnv("OPENAI_API_KEY", "");
    expect(getCapabilitiesBase()).toMatchObject({ typesafeConfigured: true, openaiConfigured: false });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("batches both judgments, preserves ordering across workers, and bounds concurrency", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    let active = 0; let peak = 0;
    const fetch = vi.fn(async (_url: string, init: RequestInit) => {
      active++; peak = Math.max(peak, active);
      const body = JSON.parse(init.body as string);
      expect(Object.keys(body.questions)).toHaveLength(body.state.reviews.length * 2);
      expect(body.questions.sentiment_0.instructions).toContain("reviews[0].text");
      await new Promise(resolve => setTimeout(resolve, 5));
      active--;
      return response(body.state.reviews.length);
    });
    vi.stubGlobal("fetch", fetch);
    const result = await classifyReviewsWithTypeSafe({ texts: Array(23).fill("배송이 너무 느려요") });
    expect(fetch).toHaveBeenCalledTimes(3); expect(peak).toBe(2);
    expect(result?.appliedCount).toBe(23);
    expect(result?.classifications).toEqual(Array(23).fill({ sentiment: "negative", category: "배송" }));
    expect(result?.judgments[22].sentiment?.confidence).toBe(0.95);
  });

  it("keeps uncertain dimensions and rejects invalid labels without losing good answers", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ answers: {
      sentiment_0: answer("negative", sentiments, 0.2), category_0: answer("배송", categories),
      sentiment_1: answer("invented", sentiments), category_1: answer("CS", categories)
    } })));
    const result = await classifyReviewsWithTypeSafe({ texts: ["그럭저럭", "문의"], fallbackClassifications: [fallback, fallback] });
    expect(result?.classifications).toEqual([{ sentiment: "positive", category: "배송" }, { sentiment: "positive", category: "CS" }]);
    expect(result?.failedBatchCount).toBe(1);
  });

  it.each(["http", "timeout", "malformed", "missing"])("falls back safely on %s failure", async kind => {
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn(async () => {
      if (kind === "timeout") throw new DOMException("Aborted", "TimeoutError");
      if (kind === "http") return new Response("Unavailable", { status: 503 });
      if (kind === "malformed") return new Response("invalid json");
      return Response.json({ answers: {} });
    }));
    const result = await classifyReviewsWithTypeSafe({ texts: ["리뷰"], fallbackClassifications: [fallback] });
    expect(result).toMatchObject({ classifications: [fallback], appliedCount: 0, failedBatchCount: 1 });
  });

  it("does not start calls without enough remaining time", async () => {
    vi.stubEnv("TYPESAFE_API_KEY", "test-key");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    const result = await classifyReviewsWithTypeSafe({ texts: ["리뷰"], fallbackClassifications: [fallback], timeBudgetMs: 100 });
    expect(result?.classifications).toEqual([fallback]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
