import { describe, expect, it } from "vitest";
import { musinsaImageUrl, musinsaReviewUrl, parseMusinsaPage } from "../src/lib/musinsa";
import { normalizeMusinsaReview } from "../src/lib/normalize";

describe("musinsaReviewUrl", () => {
  it("builds 0-based page URL with goodsNo", () => {
    const url = musinsaReviewUrl("6254168", 1);
    expect(url).toContain("goods.musinsa.com/api2/review/v1/view/list");
    expect(url).toContain("goodsNo=6254168");
    expect(url).toContain("page=1");
    expect(url).toContain("pageSize=10");
  });
});

describe("parseMusinsaPage", () => {
  it("extracts list and total from live schema", () => {
    const r = parseMusinsaPage({ data: { list: [{ no: 1 }, { no: 2 }], total: 21 } });
    expect(r.contents).toHaveLength(2);
    expect(r.totalCount).toBe(21);
  });
  it("defaults safely", () => {
    expect(parseMusinsaPage({}).contents).toEqual([]);
    expect(parseMusinsaPage({}).totalCount).toBe(0);
  });
});

describe("musinsaImageUrl", () => {
  it("resolves relative /data/estimate paths against CDN (추정 host)", () => {
    expect(musinsaImageUrl("/data/estimate/6944394_0/x.jpg")).toBe("https://image.msscdn.net/data/estimate/6944394_0/x.jpg");
  });
  it("keeps absolute urls", () => {
    expect(musinsaImageUrl("https://image.msscdn.net/a.jpg")).toBe("https://image.msscdn.net/a.jpg");
  });
});

describe("normalizeMusinsaReview", () => {
  it("maps live capture field names (grade string, createDate ISO+09:00)", () => {
    const r = normalizeMusinsaReview({
      content: "색이 예쁘고 핏하게 맞아요",
      grade: "5",
      createDate: "2026-08-20T21:35:59.000+09:00",
      likeCount: 3,
      images: [{ imageUrl: "/data/estimate/6944394_0/x.jpg" }]
    });
    expect(r.text).toBe("색이 예쁘고 핏하게 맞아요");
    expect(r.rating).toBe(5);
    expect(r.reviewedAt).toMatch(/^2026-08-20T/);
    expect(r.helpfulCount).toBe(3);
    expect(r.imageUrls?.[0]).toContain("msscdn.net");
  });
  it("tolerates missing fields", () => {
    const r = normalizeMusinsaReview({});
    expect(r.text).toBe("");
    expect(r.rating).toBeNull();
  });
});