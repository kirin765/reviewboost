import { describe, expect, it } from "vitest";
import { kurlyReviewUrl, parseKurlyPage } from "../src/lib/kurly";
import { normalizeCurlyReview } from "../src/lib/normalize";

describe("kurlyReviewUrl", () => {
  it("builds list URL with cursor when set", () => {
    const url = kurlyReviewUrl("1002458801", 10, "RECOMMEND", false, "135696205_77.72");
    expect(url).toContain("/product-review/v4/contents-products/1002458801/reviews");
    expect(url).toContain("sortType=RECOMMEND");
    expect(url).toContain("size=10");
    expect(url).toContain("after=135696205_77.72");
  });
  it("omits after for first page", () => {
    expect(kurlyReviewUrl("1002458801")).not.toContain("after=");
  });
});

describe("parseKurlyPage", () => {
  it("extracts reviews and cursor from live schema", () => {
    const r = parseKurlyPage({ data: { reviews: [{ no: 1 }], nextCursor: { after: "135854223_75.06" } } });
    expect(r.contents).toHaveLength(1);
    expect(r.nextCursor).toBe("135854223_75.06");
  });
  it("maps terminal cursor 0_0 to empty (stop)", () => {
    const r = parseKurlyPage({ data: { reviews: [], nextCursor: { after: "0_0" } } });
    expect(r.nextCursor).toBe("");
  });
  it("defaults safely", () => {
    expect(parseKurlyPage({}).contents).toEqual([]);
    expect(parseKurlyPage({}).nextCursor).toBe("");
  });
});

describe("normalizeCurlyReview", () => {
  it("maps live capture field names (contents/registeredAt, 별점 없음)", () => {
    const r = normalizeCurlyReview({
      no: 135753351,
      contents: "저는 밥은 안하고 장어만 먹었습니다",
      registeredAt: "2026-07-16T16:29:37",
      likeCount: 6,
      ownerName: "박**",
      images: [{ image: "https://img-cf.kurly.com/hdims/a.jpg" }]
    });
    expect(r.text).toContain("장어만 먹었습니다");
    expect(r.rating).toBeNull();
    expect(r.reviewedAt).toMatch(/^2026-07-16T/);
    expect(r.author).toBe("박**");
    expect(r.helpfulCount).toBe(6);
    expect(r.imageUrls?.[0]).toContain("img-cf.kurly.com");
  });
  it("tolerates missing fields", () => {
    const r = normalizeCurlyReview({});
    expect(r.text).toBe("");
    expect(r.rating).toBeNull();
  });
});