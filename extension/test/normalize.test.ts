import { describe, expect, it } from "vitest";
import {
  cleanReviews,
  clampRating,
  normalizeCoupangReview,
  normalizeSmartstoreReview,
  toIsoDate,
  toReviewRows
} from "../src/lib/normalize";

describe("clampRating", () => {
  it("keeps 0-5", () => {
    expect(clampRating(5)).toBe(5);
    expect(clampRating("3")).toBe(3);
  });
  it("halves 6-10 scale", () => {
    expect(clampRating(8)).toBe(4);
    expect(clampRating(10)).toBe(5);
  });
  it("returns null for empty/invalid/out-of-range", () => {
    expect(clampRating(null)).toBeNull();
    expect(clampRating("")).toBeNull();
    expect(clampRating("abc")).toBeNull();
    expect(clampRating(11)).toBeNull();
  });
});

describe("toIsoDate", () => {
  it("handles epoch ms (number and string)", () => {
    expect(toIsoDate(1700000000000)).toContain("2023-11-");
    expect(toIsoDate("1700000000000")).toContain("2023-11-");
  });
  it("normalizes dotted/slashed dates", () => {
    expect(toIsoDate("2026.01.15")).toContain("2026-01-15");
    expect(toIsoDate("2026/01/15")).toContain("2026-01-15");
  });
  it("returns null for empty/garbage", () => {
    expect(toIsoDate("")).toBeNull();
    expect(toIsoDate("garbage")).toBeNull();
  });
});

describe("normalizeCoupangReview", () => {
  it("maps primary fields", () => {
    const r = normalizeCoupangReview({
      content: "좋아요",
      rating: 5,
      reviewAt: 1700000000000,
      title: "제목",
      displayName: "홍길동",
      helpfulCount: 3
    });
    expect(r.text).toBe("좋아요");
    expect(r.rating).toBe(5);
    expect(r.reviewedAt).toContain("2023-11-");
    expect(r.title).toBe("제목");
    expect(r.author).toBe("홍길동");
    expect(r.helpfulCount).toBe(3);
  });
  it("uses fallback field names", () => {
    const r = normalizeCoupangReview({ reviewContent: "별로", nickname: "익명" });
    expect(r.text).toBe("별로");
    expect(r.author).toBe("익명");
    expect(r.rating).toBeNull();
  });
});

describe("normalizeSmartstoreReview", () => {
  it("maps the real captured SmartStore review shape", () => {
    const r = normalizeSmartstoreReview({
      reviewScore: 5,
      reviewContent: "응대도 빠르시고 포장도 굿입니다.",
      createDate: "2026-05-31T09:51:27.382+00:00",
      maskedWriterId: "dj****"
    });
    expect(r.text).toBe("응대도 빠르시고 포장도 굿입니다.");
    expect(r.rating).toBe(5);
    expect(r.reviewedAt).toContain("2026-05-31");
    expect(r.author).toBe("dj****");
  });
});

describe("cleanReviews / toReviewRows", () => {
  it("drops empty-text rows", () => {
    const cleaned = cleanReviews([
      { text: "ok", rating: 5 },
      { text: "   ", rating: 3 }
    ]);
    expect(cleaned).toHaveLength(1);
  });
  it("strips extra fields for the funnel payload", () => {
    const rows = toReviewRows([{ text: "ok", rating: 5, reviewedAt: "2026-01-01T00:00:00.000Z", title: "t", author: "a", helpfulCount: 2 }]);
    expect(rows[0]).toEqual({ text: "ok", rating: 5, reviewedAt: "2026-01-01T00:00:00.000Z" });
  });
});
