import { afterEach, describe, expect, it, vi } from "vitest";
import { oliveYoungImageUrl, oliveYoungReviewBody, parseOliveYoungPage } from "../src/lib/oliveyoung";
import { normalizeOliveYoungReview } from "../src/lib/normalize";
import { collectOliveYoung } from "../src/content/collect-oliveyoung";
import { detectPlatform, platformLabel } from "../src/lib/platforms";
import chromeManifest from "../public/manifest.json";
import firefoxManifest from "../public/manifest.firefox.json";

vi.mock("../src/lib/collector", async (importOriginal) => ({
  ...await importOriginal<typeof import("../src/lib/collector")>(),
  realSleep: vi.fn().mockResolvedValue(undefined)
}));

// Minimal anonymized fixture matching the live v2 response captured 2026-10-11.
const review = (reviewId = 1) => ({
  reviewId, content: `촉촉하고 잘 발려요 ${reviewId}`, reviewScore: 5,
  createdDateTime: "2026.10.10", recommendCount: 2,
  profileDto: { memberNickname: "테스트", profileKey: "private-profile-key" },
  photoReviewList: [{ imagePath: "2026/10/10/example.png" }]
});
const page = (reviews = [review()], hasNext = false, cursorId = 1) => ({
  status: "SUCCESS", code: 200, data: {
    goodsReviewList: reviews, hasNext, loginRequired: false,
    nextCursorId: hasNext ? cursorId : null,
    nextCursorScore: hasNext ? 0 : null, nextCursorCount: null
  }
});
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json" }
});
afterEach(() => vi.unstubAllGlobals());

describe("Olive Young detection and permissions", () => {
  it.each(["A000000247719", "B000000233633"])("detects product %s with tracking parameters", (id) => {
    expect(detectPlatform(`https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?trackingCd=x&goodsNo=${id}`)?.productId).toBe(id);
    expect(platformLabel("oliveyoung")).toBe("올리브영");
  });
  it.each([
    "https://www.oliveyoung.co.kr/store/main/main.do?goodsNo=A000000247719",
    "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=",
    "https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A123/extra",
    "https://www.oliveyoung.co.kr.evil.com/store/goods/getGoodsDetail.do?goodsNo=A123",
    "https://global.oliveyoung.com/product/A123"
  ])("rejects unsupported URL %s", (url) => expect(detectPlatform(url)).toBeNull());
  it.each([chromeManifest, firefoxManifest])("grants the product and review API access", (manifest) => {
    expect(manifest.host_permissions).toContain("*://www.oliveyoung.co.kr/*");
    expect(manifest.host_permissions).toContain("*://m.oliveyoung.co.kr/review/api/*");
    expect(manifest.content_scripts.find((cs) => cs.js.includes("content.js"))?.matches)
      .toContain("*://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do*");
  });
});

describe("Olive Young response and normalization", () => {
  it("uses page zero initially and preserves zero/null cursor values thereafter", () => {
    expect(oliveYoungReviewBody("A123")).toEqual({ goodsNumber: "A123", size: 10, sortType: "USEFUL_SCORE_DESC", reviewType: "ALL", page: 0 });
    const parsed = parseOliveYoungPage(page([review()], true));
    expect(oliveYoungReviewBody("A123", parsed.nextCursor)).toEqual({
      goodsNumber: "A123", size: 10, sortType: "USEFUL_SCORE_DESC", reviewType: "ALL",
      cursorId: 1, cursorScore: 0, cursorCount: null
    });
    expect(parseOliveYoungPage(page()).nextCursor).toBeUndefined();
  });
  it("maps export fields without including internal profile identifiers", () => {
    expect(normalizeOliveYoungReview(review())).toEqual({
      text: "촉촉하고 잘 발려요 1", rating: 5, reviewedAt: "2026-10-10T00:00:00.000Z",
      author: "테스트", helpfulCount: 2,
      imageUrls: ["https://image.oliveyoung.co.kr/uploads/images/gdasEditor/2026/10/10/example.png"]
    });
    expect(normalizeOliveYoungReview({})).toMatchObject({ text: "", rating: null, reviewedAt: null });
    expect(oliveYoungImageUrl("javascript:alert(1)")).toBe("");
    expect(oliveYoungImageUrl("//image.oliveyoung.co.kr/a.png")).toBe("https://image.oliveyoung.co.kr/a.png");
  });
  it.each([null, {}, { code: 500 }, { code: 200, data: {} }, {
    code: 200, data: { goodsReviewList: [null], hasNext: false }
  }, { code: 200, data: { goodsReviewList: [review()], hasNext: true } }])("rejects malformed/error responses %j", (body) => {
    expect(() => parseOliveYoungPage(body)).toThrow(expect.objectContaining({ code: "UNSUPPORTED" }));
  });
});

describe("Olive Young collection", () => {
  it("follows cursors, deduplicates overlapping reviews and enforces the requested limit", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response(page([review(1), review(2)], true, 2)))
      .mockResolvedValueOnce(response(page([review(2), review(3), review(4)])));
    vi.stubGlobal("fetch", fetch);
    const progress = vi.fn();
    const result = await collectOliveYoung("A123", { maxItems: 3, onProgress: progress });
    expect(result.map((r) => r.text)).toEqual([1, 2, 3].map((id) => review(id).content));
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(fetch.mock.calls[1][1].body)).toMatchObject({ cursorId: 2, cursorScore: 0, cursorCount: null });
    expect(JSON.parse(fetch.mock.calls[1][1].body)).not.toHaveProperty("page");
    expect(fetch.mock.calls[0][1].credentials).toBe("include");
    expect(progress).toHaveBeenCalled();
  });
  it("stops at the limit without requesting the next cursor", async () => {
    const fetch = vi.fn().mockResolvedValue(response(page([review()], true)));
    vi.stubGlobal("fetch", fetch);
    expect(await collectOliveYoung("A123", { maxItems: 1 })).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("honors cancellation between requests", async () => {
    const fetch = vi.fn().mockResolvedValue(response(page([review()], true)));
    vi.stubGlobal("fetch", fetch);
    let cancelled = false;
    expect(await collectOliveYoung("A123", { maxItems: 20, shouldCancel: () => cancelled, onProgress: () => { cancelled = true; } })).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("stops repeated cursors instead of collecting duplicates indefinitely", async () => {
    const fetch = vi.fn().mockResolvedValue(response(page([review()], true)));
    // Each fetch must return a fresh Response body.
    fetch.mockImplementation(async () => response(page([review()], true)));
    vi.stubGlobal("fetch", fetch);
    await expect(collectOliveYoung("A123", { maxItems: 20 })).rejects.toMatchObject({ code: "UNSUPPORTED" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it.each([[401, "LOGIN"], [403, "BLOCKED"], [429, "BLOCKED"]])("does not retry HTTP %s", async (status, code) => {
    const fetch = vi.fn().mockResolvedValue(response({}, status as number));
    vi.stubGlobal("fetch", fetch);
    await expect(collectOliveYoung("A123", { maxItems: 20 })).rejects.toMatchObject({ code });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("reports a login gate rather than treating it as no reviews", async () => {
    const body = page([]); body.data.loginRequired = true;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(body)));
    await expect(collectOliveYoung("A123", { maxItems: 20 })).rejects.toMatchObject({ code: "LOGIN" });
  });
  it("reports an empty product", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(page([]))));
    await expect(collectOliveYoung("A123", { maxItems: 20 })).rejects.toMatchObject({ code: "EMPTY" });
  });
});
