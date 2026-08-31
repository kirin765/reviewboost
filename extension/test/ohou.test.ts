import { describe, expect, it } from "vitest";
import { ohouReviewUrl, parseOhouPage } from "../src/lib/ohou";
import { normalizeOhouReview } from "../src/lib/normalize";

describe("ohouReviewUrl", () => {
  it("builds 1-based page URL with productionId", () => {
    const url = ohouReviewUrl("3609096", 2);
    expect(url).toContain("store.ohou.se/api/goods/reviews");
    expect(url).toContain("productionId=3609096");
    expect(url).toContain("page=2");
    expect(url).toContain("per=5");
    expect(url).toContain("order=best");
  });
});

describe("parseOhouPage", () => {
  it("extracts reviews and totalCount from live schema", () => {
    const r = parseOhouPage({ reviews: [{ id: 1 }, { id: 2 }], totalCount: 8022 });
    expect(r.contents).toHaveLength(2);
    expect(r.totalCount).toBe(8022);
  });
  it("defaults safely", () => {
    expect(parseOhouPage({}).contents).toEqual([]);
    expect(parseOhouPage({}).totalCount).toBe(0);
  });
});

describe("normalizeOhouReview", () => {
  it("maps live capture field names (review.comment/starAvg, createdAt yyyy.MM.dd)", () => {
    const r = normalizeOhouReview({
      id: 64591631,
      review: { comment: "배송이 빠르고 설치도 잘 받았습니다.", starAvg: 5 },
      createdAt: "2026.08.24",
      praiseCount: 2,
      writerNickname: "대가알",
      card: { imageUrl: "https://prs.ohouse.com/apne2/a.webp?w=1440" }
    });
    expect(r.text).toContain("배송이 빠르고");
    expect(r.rating).toBe(5);
    expect(r.reviewedAt).toMatch(/^2026-08-24T/);
    expect(r.author).toBe("대가알");
    expect(r.helpfulCount).toBe(2);
    expect(r.imageUrls?.[0]).toContain("prs.ohouse.com");
  });
  it("tolerates missing fields", () => {
    const r = normalizeOhouReview({});
    expect(r.text).toBe("");
    expect(r.rating).toBeNull();
  });
});