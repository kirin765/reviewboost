import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadCoupangCsv } from "@/lib/coupang_crawler";

const baseEnv = { ...process.env };

describe("downloadCoupangCsv", () => {
  afterEach(() => {
    process.env = { ...baseEnv };
    vi.restoreAllMocks();
  });

  it("throws when crawler base url is missing", async () => {
    delete process.env.COUPANG_CRAWLER_BASE_URL;
    await expect(downloadCoupangCsv({ productUrl: "https://www.coupang.com/vp/products/123" })).rejects.toMatchObject({
      code: "CRAWLER_NOT_CONFIGURED"
    });
  });

  it("throws on invalid coupang url", async () => {
    process.env.COUPANG_CRAWLER_BASE_URL = "https://crawler.example.com";
    await expect(downloadCoupangCsv({ productUrl: "https://example.com/item/1" })).rejects.toMatchObject({
      code: "CRAWLER_INVALID_PRODUCT_URL"
    });
  });

  it("passes through csv buffer on success", async () => {
    process.env.COUPANG_CRAWLER_BASE_URL = "https://crawler.example.com";
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response("a,b\n1,2\n", {
          status: 200,
          headers: {
            "content-type": "text/csv; charset=utf-8",
            "content-disposition": 'attachment; filename="reviews.csv"'
          }
        })
      );

    const result = await downloadCoupangCsv({ productUrl: "https://www.coupang.com/vp/products/12345" });
    expect(result.filename).toBe("reviews.csv");
    expect(result.contentType).toContain("csv");
    expect(result.csvBuffer.byteLength).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });
});
