import { describe, expect, it, vi } from "vitest";
import { OPTIONS, POST } from "./route";

const mocks = vi.hoisted(() => ({
  runAnalysisPipeline: vi.fn(),
  logApiError: vi.fn()
}));

vi.mock("@/lib/analysis_pipeline", () => ({
  runAnalysisPipeline: mocks.runAnalysisPipeline
}));

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

const EXT_ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

function extRequest(body: unknown): Request {
  return new Request("https://reviewboost.co.kr/api/extension/analyze", {
    method: "POST",
    headers: { origin: EXT_ORIGIN, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}

describe("POST /api/extension/analyze", () => {
  it("analyzes posted reviews and echoes the extension origin", async () => {
    mocks.runAnalysisPipeline.mockResolvedValueOnce({
      payload: { meta: { filename: null, stored: false, truncated: false }, stats: { total: 1 } },
      classified: []
    });

    const res = await POST(
      extRequest({ source: "coupang", reviews: [{ text: "좋아요", rating: 5, reviewedAt: "2026-01-15" }] })
    );

    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
    expect(res.headers.get("vary")).toContain("Origin");

    const payload = (await res.json()) as { meta: { filename: string }; stats: { total: number } };
    expect(payload.meta.filename).toBe("쿠팡 상품 리뷰");
    expect(payload.stats.total).toBe(1);

    const passed = mocks.runAnalysisPipeline.mock.calls[0][0];
    expect(passed.csvText.startsWith("내용,평점,작성일")).toBe(true);
    expect(passed.useLLM).toBe(false);
    expect(passed.plan).toBe("free");
  });

  it("rejects an unsupported source (with CORS headers on the 4xx)", async () => {
    const res = await POST(extRequest({ source: "gmarket", reviews: [{ text: "x", rating: 5 }] }));
    expect(res.status).toBe(400);
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("ANALYZE_PAYLOAD_INVALID");
  });

  it("rejects when all reviews have empty text", async () => {
    const res = await POST(extRequest({ source: "coupang", reviews: [{ text: "   ", rating: 5 }] }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toContain("수집된 리뷰가 없습니다");
  });

  it("answers preflight with 204 + CORS", async () => {
    const req = new Request("https://reviewboost.co.kr/api/extension/analyze", {
      method: "OPTIONS",
      headers: { origin: EXT_ORIGIN }
    });
    const res = await OPTIONS(req);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
  });
});
