import { describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  downloadCoupangCsv: vi.fn(),
  logApiError: vi.fn()
}));

vi.mock("@/lib/coupang_crawler", () => ({
  downloadCoupangCsv: mocks.downloadCoupangCsv
}));

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

describe("POST /api/coupang-csv/download", () => {
  it("returns csv binary response on success", async () => {
    mocks.downloadCoupangCsv.mockResolvedValueOnce({
      csvBuffer: new TextEncoder().encode("a,b\n1,2\n").buffer,
      contentType: "text/csv; charset=utf-8",
      filename: "reviews.csv"
    });

    const req = new Request("https://reviewboost.app/api/coupang-csv/download", {
      method: "POST",
      headers: {
        origin: "https://reviewboost.app",
        "content-type": "application/json"
      },
      body: JSON.stringify({ productUrl: "https://www.coupang.com/vp/products/123" })
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/csv");
    expect(res.headers.get("content-disposition")).toContain("reviews.csv");
  });

  it("returns payload invalid when productUrl is missing", async () => {
    const req = new Request("https://reviewboost.app/api/coupang-csv/download", {
      method: "POST",
      headers: {
        origin: "https://reviewboost.app",
        "content-type": "application/json"
      },
      body: JSON.stringify({})
    });

    const res = await POST(req);
    const body = (await res.json()) as { error: { code: string } };
    expect(res.status).toBe(400);
    expect(body.error.code).toBe("CRAWLER_PAYLOAD_INVALID");
  });
});
