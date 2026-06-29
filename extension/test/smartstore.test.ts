import { describe, expect, it } from "vitest";
import {
  buildQueryPagesRequest,
  extractSmartstoreProductNo,
  findMerchantNo,
  findOriginProductNo,
  isSmartstoreHost,
  parseSmartstorePage
} from "../src/lib/smartstore";

describe("isSmartstoreHost", () => {
  it("matches smartstore and brand hosts", () => {
    expect(isSmartstoreHost("smartstore.naver.com")).toBe(true);
    expect(isSmartstoreHost("brand.naver.com")).toBe(true);
    expect(isSmartstoreHost("www.coupang.com")).toBe(false);
  });
});

describe("extractSmartstoreProductNo", () => {
  it("parses /{store}/products/{no}", () => {
    expect(extractSmartstoreProductNo("/mystore/products/13089995455")).toBe("13089995455");
  });
  it("returns null without a product path", () => {
    expect(extractSmartstoreProductNo("/mystore")).toBeNull();
  });
});

describe("findMerchantNo", () => {
  it("extracts checkoutMerchantNo from the page's own review request urls", () => {
    const urls = [
      "https://smartstore.naver.com/i/v1/contents/reviews/product-summary/13089995455?checkoutMerchantNo=520014391"
    ];
    expect(findMerchantNo(urls)).toBe("520014391");
  });
  it("falls back to preload state", () => {
    expect(findMerchantNo([], { a: { checkoutMerchantNo: 511884417 } })).toBe("511884417");
  });
  it("returns null when nothing found", () => {
    expect(findMerchantNo([], {})).toBeNull();
  });
});

describe("findOriginProductNo", () => {
  it("extracts originProductNo from the page's review request URL paths", () => {
    // 페이지는 URL productNo(13089995455)가 아니라 원본 13031957477 을 경로에 쓴다.
    const urls = [
      "https://smartstore.naver.com/i/v1/contents/reviews/product-summary/13031957477?checkoutMerchantNo=520014391",
      "https://smartstore.naver.com/i/v1/contents/reviews/query-pages",
      "https://smartstore.naver.com/i/v1/contents/reviews/gallery-attaches/13031957477?checkoutMerchantNo=520014391"
    ];
    expect(findOriginProductNo(urls)).toBe("13031957477");
  });
  it("returns null when no review request fired yet", () => {
    expect(findOriginProductNo(["https://smartstore.naver.com/some/other/asset.js"])).toBeNull();
  });
});

describe("buildQueryPagesRequest", () => {
  it("builds the confirmed query-pages POST with the captured body shape", () => {
    const req = buildQueryPagesRequest("520014391", "13031957477", 2, 20);
    expect(req.method).toBe("POST");
    expect(req.url).toBe("/i/v1/contents/reviews/query-pages");
    expect(JSON.parse(req.body)).toEqual({
      checkoutMerchantNo: 520014391,
      originProductNo: 13031957477,
      page: 2,
      pageSize: 20,
      reviewSearchSortType: "REVIEW_RANKING"
    });
  });
});

describe("parseSmartstorePage", () => {
  it("reads the real query-pages response shape", () => {
    const r = parseSmartstorePage({ contents: [{}, {}], totalElements: 22, totalPages: 2 });
    expect(r.contents).toHaveLength(2);
    expect(r.total).toBe(22);
    expect(r.totalPages).toBe(2);
  });
  it("defaults safely when totals are missing", () => {
    const r = parseSmartstorePage({ contents: [{}] });
    expect(r.contents).toHaveLength(1);
    expect(r.total).toBe(1);
    expect(r.totalPages).toBeUndefined();
  });
});
