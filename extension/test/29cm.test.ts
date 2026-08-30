import { describe, expect, it } from "vitest";
import { parseTwentyNinePage, twentyNineImageUrl, twentyNineReviewApiUrl } from "../src/lib/29cm";
import { normalize29cmReview } from "../src/lib/normalize";

describe("twentyNineReviewApiUrl", () => {
  it("builds 0-based page URL with itemId", () => {
    const url = twentyNineReviewApiUrl("2632177", 0);
    expect(url).toContain("itemId=2632177");
    expect(url).toContain("page=0");
    expect(url).toContain("size=20");
    expect(url).toContain("sort=BEST");
  });
});

describe("parseTwentyNinePage", () => {
  it("extracts results and count from live schema", () => {
    const r = parseTwentyNinePage({ result: "SUCCESS", data: { count: 2, results: [{ a: 1 }, { a: 2 }] } });
    expect(r.contents).toHaveLength(2);
    expect(r.totalCount).toBe(2);
  });
  it("defaults safely", () => {
    expect(parseTwentyNinePage({}).contents).toEqual([]);
    expect(parseTwentyNinePage({}).totalCount).toBe(0);
  });
});

describe("twentyNineImageUrl", () => {
  it("resolves relative /next-product paths against CDN", () => {
    expect(twentyNineImageUrl("/next-product/2025/10/a.jpg")).toBe("https://cdn.29cm.co.kr/next-product/2025/10/a.jpg");
  });
  it("keeps absolute and protocol-relative urls", () => {
    expect(twentyNineImageUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(twentyNineImageUrl("//cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
  });
});

describe("normalize29cmReview", () => {
  it("maps live capture field names", () => {
    const r = normalize29cmReview({
      contents: "소재 디자인 맘에들어요",
      point: 3,
      insertTimestamp: "2025-10-03 14:35:25",
      userId: "2an**",
      helpfulCount: 4,
      uploadFiles: [{ url: "/next-product/2025/10/03/x.jpg" }]
    });
    expect(r.text).toBe("소재 디자인 맘에들어요");
    expect(r.rating).toBe(3);
    // toIsoDate("YYYY-MM-DD HH:mm:ss") 는 로컬 시간 기준이라 TZ 따라 초만 다르다 — 날짜만 검증.
    expect(r.reviewedAt).toMatch(/^2025-10-03T/);
    expect(r.author).toBe("2an**");
    expect(r.helpfulCount).toBe(4);
    expect(r.imageUrls?.[0]).toContain("cdn.29cm.co.kr");
  });
  it("tolerates missing fields", () => {
    const r = normalize29cmReview({});
    expect(r.text).toBe("");
    expect(r.rating).toBeNull();
  });
});