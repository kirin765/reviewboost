import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractTalkstoreProduct,
  parseTalkstorePage,
  talkstoreCreatedAt,
  talkstoreImageUrl,
  talkstoreRatingToFive,
  talkstoreReviewApiUrl
} from "../src/lib/talkstore";
import { normalizeTalkstoreReview } from "../src/lib/normalize";
import { collectTalkstore } from "../src/content/collect-talkstore";
import { detectPlatform, platformLabel } from "../src/lib/platforms";
import chromeManifest from "../public/manifest.json";
import firefoxManifest from "../public/manifest.firefox.json";

vi.mock("../src/lib/collector", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/collector")>(),
  realSleep: vi.fn().mockResolvedValue(undefined)
}));
afterEach(() => vi.unstubAllGlobals());

// Anonymized fixture matching the live store.kakao.com reviews response captured 2026-10-14.
const review = (id: string, rating = 4) => ({
  id,
  createdAt: "20260902233346",
  content: `향기가 좋습니다 ${id}`,
  ratingView: { productStarRating: rating, deliveryStarRating: 4 },
  writer: { displayName: "이두*" },
  likeView: { likeCount: 1 },
  imageViews: [{ originUrl: "https://st.kakaocdn.net/shoppingstore/store/review/example.jpg" }]
});
const page = (contents: unknown[], last = true, totalCount = contents.length) => ({
  result: true,
  data: { contents, last, page: 0, totalCount, timestamp: 1791957420000 }
});
const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("Talkstore detection and permissions", () => {
  it("extracts store slug and product id from product URLs", () => {
    expect(extractTalkstoreProduct("https://store.kakao.com/dongwonfnb/products/61887415")).toEqual({
      store: "dongwonfnb",
      productId: "61887415"
    });
    expect(
      detectPlatform("https://store.kakao.com/beyond/products/781005760?docId=781005760")?.productId
    ).toBe("781005760");
    expect(platformLabel("talkstore")).toBe("톡스토어");
  });
  it.each([
    "https://store.kakao.com/beyond",
    "https://store.kakao.com/beyond/products/781005760/bundles",
    "https://store.kakao.com/search/result/product?q=%EC%83%9D%EC%88%98",
    "https://store.kakao.com/beyond/products/abc",
    "https://store.kakao.com.evil.com/beyond/products/1",
    "https://gift.kakao.com/products/123"
  ])("rejects unsupported URL %s", (url) => {
    expect(extractTalkstoreProduct(url)).toBeNull();
    expect(detectPlatform(url)).toBeNull();
  });
  it.each([chromeManifest, firefoxManifest])("grants the product page access", (manifest) => {
    expect(manifest.host_permissions).toContain("*://store.kakao.com/*");
    expect(manifest.content_scripts.find((cs) => cs.js.includes("content.js"))?.matches).toContain(
      "*://store.kakao.com/*/products/*"
    );
  });
});

describe("Talkstore response and normalization", () => {
  it("builds a 0-based API URL with the site's default sort", () => {
    expect(talkstoreReviewApiUrl("beyond", "781005760", 0, 50)).toBe(
      "/a/f-m/beyond/products/781005760/reviews" +
        "?page=0&productDetailReviewFilter=ALL&productDetailReviewSort=RECOMMENDATION_SCORE&size=50&mask=false"
    );
  });
  it("converts the 4-point scale into the shared 5-point scale", () => {
    expect(talkstoreRatingToFive(4)).toBe(5); // 매우 만족해요
    expect(talkstoreRatingToFive(3)).toBe(4); // 만족해요
    expect(talkstoreRatingToFive(2)).toBe(2); // 아쉬워요
    expect(talkstoreRatingToFive(1)).toBe(1); // 매우 아쉬워요
    for (const v of [null, undefined, "", "abc", 0, 5]) expect(talkstoreRatingToFive(v)).toBeNull();
  });
  it("parses createdAt KST (YYYYMMDDHHmmss) into ISO", () => {
    expect(talkstoreCreatedAt("20260902233346")).toBe("2026-09-02T14:33:46.000Z");
    expect(talkstoreCreatedAt("20260101000000")).toBe("2025-12-31T15:00:00.000Z");
    expect(talkstoreCreatedAt("2026-09-02")).toBeNull();
    expect(talkstoreCreatedAt(null)).toBeNull();
  });
  it("maps export fields without internal identifiers", () => {
    expect(normalizeTalkstoreReview(review("r1"))).toEqual({
      text: "향기가 좋습니다 r1",
      rating: 5,
      reviewedAt: "2026-09-02T14:33:46.000Z",
      author: "이두*",
      helpfulCount: 1,
      imageUrls: ["https://st.kakaocdn.net/shoppingstore/store/review/example.jpg"]
    });
    expect(normalizeTalkstoreReview({})).toMatchObject({ text: "", rating: null, reviewedAt: null });
    expect(talkstoreImageUrl("javascript:alert(1)")).toBe("");
    expect(talkstoreImageUrl("//st.kakaocdn.net/a.jpg")).toBe("https://st.kakaocdn.net/a.jpg");
  });
  it.each([null, {}, { result: false, data: {} }, { result: true, data: {} }, {
    result: true, data: { contents: [null], last: false }
  }, { result: true, data: { contents: [], last: "true" } }])("rejects malformed responses %j", (body) => {
    expect(() => parseTalkstorePage(body)).toThrow(expect.objectContaining({ code: "UNSUPPORTED" }));
  });
  it("treats a missing totalCount as zero", () => {
    expect(parseTalkstorePage({ result: true, data: { contents: [], last: true } })).toEqual({
      contents: [],
      last: true,
      totalCount: 0
    });
  });
});

describe("Talkstore collection", () => {
  it("follows 0-based pages, deduplicates overlapping ids and reports progress", async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(response(page([review("r1"), review("r2")], false, 3)))
      .mockResolvedValueOnce(response(page([review("r2"), review("r3")])));
    vi.stubGlobal("fetch", fetch);
    const progress = vi.fn();
    const result = await collectTalkstore("beyond", "781005760", { maxItems: 10, onProgress: progress });
    expect(result.map((r) => r.text)).toEqual(["r1", "r2", "r3"].map((id) => `향기가 좋습니다 ${id}`));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0][0]).toContain("page=0");
    expect(fetch.mock.calls[1][0]).toContain("page=1");
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
    expect(progress).toHaveBeenCalledWith(2, 3);
    expect(progress).toHaveBeenCalledWith(3, 3);
  });
  it("stops at the requested limit without fetching further pages", async () => {
    const fetch = vi.fn().mockResolvedValue(response(page([review("r1"), review("r2"), review("r3")], false, 30)));
    vi.stubGlobal("fetch", fetch);
    const onSummary = vi.fn();
    expect(await collectTalkstore("beyond", "1", { maxItems: 2, onSummary })).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ collected: 2, partial: false }));
  });
  it("honors cancellation between requests", async () => {
    const fetch = vi.fn().mockResolvedValue(response(page([review("r1")], false, 30)));
    vi.stubGlobal("fetch", fetch);
    let cancelled = false;
    const result = await collectTalkstore("beyond", "1", {
      maxItems: 100,
      shouldCancel: () => cancelled,
      onProgress: () => { cancelled = true; }
    });
    expect(result).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("stops after repeated identical pages instead of looping forever", async () => {
    const fetch = vi.fn(async () => response(page([review("r1")], false, 3)));
    vi.stubGlobal("fetch", fetch);
    const onSummary = vi.fn();
    const result = await collectTalkstore("beyond", "1", { maxItems: 100, onSummary });
    expect(result).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(onSummary).toHaveBeenCalledWith(expect.objectContaining({ collected: 1, partial: true }));
  });
  it("reports partial results when the last page arrives early", async () => {
    const fetch = vi.fn().mockResolvedValue(response(page([review("r1"), review("r2")], true, 100)));
    vi.stubGlobal("fetch", fetch);
    const onSummary = vi.fn();
    await collectTalkstore("beyond", "1", { maxItems: 100, onSummary });
    expect(onSummary).toHaveBeenCalledWith({
      reportedTotal: 100, requested: 100, collected: 2, textReviews: 2, partial: true
    });
  });
  it.each([[401, "LOGIN"], [403, "BLOCKED"], [429, "BLOCKED"], [500, "UNSUPPORTED"]])(
    "does not retry HTTP %s", async (status, code) => {
      const fetch = vi.fn().mockResolvedValue(response({}, status as number));
      vi.stubGlobal("fetch", fetch);
      await expect(collectTalkstore("beyond", "1", { maxItems: 10 })).rejects.toMatchObject({ code });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  it("reports an empty product", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(page([], true, 0))));
    await expect(collectTalkstore("beyond", "1", { maxItems: 10 })).rejects.toMatchObject({ code: "EMPTY" });
  });
});
