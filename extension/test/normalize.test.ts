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
  it("extracts attachedImages cdnPath and prefixes the Coupang CDN base", () => {
    const r = normalizeCoupangReview({
      content: "사진 리뷰",
      attachedImages: [{ cdnPath: "/review/abc.jpg" }, { cdnPath: "https://static.coupangcdn.com/review/def.jpg" }]
    });
    expect(r.imageUrls).toEqual([
      "https://static.coupangcdn.com/review/abc.jpg",
      "https://static.coupangcdn.com/review/def.jpg"
    ]);
  });
  it("extracts the real Coupang attachments shape (imgSrcOrigin) and skips videos", () => {
    const r = normalizeCoupangReview({
      content: "사진 리뷰",
      attachments: [
        { attachmentType: "IMAGE", imgSrcOrigin: "https://thumbnail.coupangcdn.com/thumbnails/local/q-1/image2/1.jpg", imgSrcThumbnail: "https://thumbnail.coupangcdn.com/thumbnails/local/320/image2/1.jpg" },
        { attachmentType: "VIDEO", imgSrcOrigin: "https://thumbnail.coupangcdn.com/video.mp4" }
      ]
    });
    expect(r.imageUrls).toEqual(["https://thumbnail.coupangcdn.com/thumbnails/local/q-1/image2/1.jpg"]);
  });
  it("falls back to imgSrcThumbnail and prefixes uploadedFilePath", () => {
    const r = normalizeCoupangReview({
      content: "썸네일만",
      attachments: [{ attachmentType: "IMAGE", imgSrcThumbnail: "https://thumbnail.coupangcdn.com/thumbnails/local/320/x.jpg" }]
    });
    expect(r.imageUrls).toEqual(["https://thumbnail.coupangcdn.com/thumbnails/local/320/x.jpg"]);
    const r2 = normalizeCoupangReview({
      content: "경로만",
      attachments: [{ attachmentType: "IMAGE", uploadedFilePath: "image2/PRODUCTREVIEW/202606/16/a.jpg" }]
    });
    expect(r2.imageUrls).toEqual([
      "https://thumbnail.coupangcdn.com/thumbnails/local/q-1/image2/PRODUCTREVIEW/202606/16/a.jpg"
    ]);
  });
  it("omits imageUrls when the review has no images", () => {
    const r = normalizeCoupangReview({ content: "텍스트만" });
    expect(r.imageUrls).toBeUndefined();
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
  it("extracts attachImages/attachments imageUrl arrays", () => {
    const r = normalizeSmartstoreReview({
      reviewContent: "사진 첨부",
      attachImages: [{ imageUrl: "https://shop-phinf.pstatic.net/1.jpg" }, { imageUrl: "https://shop-phinf.pstatic.net/2.jpg" }]
    });
    expect(r.imageUrls).toEqual([
      "https://shop-phinf.pstatic.net/1.jpg",
      "https://shop-phinf.pstatic.net/2.jpg"
    ]);
  });
  it("extracts the real SmartStore reviewAttaches shape (attachUrl) and skips videos", () => {
    const r = normalizeSmartstoreReview({
      reviewContent: "사진 리뷰",
      reviewAttaches: [
        { reviewAttachmentType: "I", attachUrl: "https://phinf.pstatic.net/checkout.phinf/1.jpg", attachPath: "https://phinf.pstatic.net/checkout.phinf/1.jpg" },
        { reviewAttachmentType: "V", attachUrl: "https://phinf.pstatic.net/checkout.phinf/v.mp4" }
      ]
    });
    expect(r.imageUrls).toEqual(["https://phinf.pstatic.net/checkout.phinf/1.jpg"]);
  });
  it("picks up the repThumbnailAttach / representAttach single-object forms", () => {
    const r = normalizeSmartstoreReview({
      reviewContent: "대표 이미지",
      repThumbnailAttach: { reviewAttachmentType: "I", attachUrl: "https://phinf.pstatic.net/thumb.jpg" }
    });
    expect(r.imageUrls).toEqual(["https://phinf.pstatic.net/thumb.jpg"]);
    const r2 = normalizeSmartstoreReview({
      reviewContent: "갤러리",
      representAttach: { attachType: "I", attachPath: "https://phinf.pstatic.net/gallery.jpg" }
    });
    expect(r2.imageUrls).toEqual(["https://phinf.pstatic.net/gallery.jpg"]);
  });
  it("dedups repeated image urls and drops non-http values", () => {
    const r = normalizeSmartstoreReview({
      reviewContent: "중복",
      attachments: [{ imageUrl: "https://a.com/x.jpg" }, { imageUrl: "https://a.com/x.jpg" }, { imageUrl: "ftp://nope" }]
    });
    expect(r.imageUrls).toEqual(["https://a.com/x.jpg"]);
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
