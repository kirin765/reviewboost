import { describe, expect, it } from "vitest";
import {
  buildGroupProductReviewRequest,
  buildProductSummaryReviewRequest,
  buildQueryPagesRequest,
  extractSmartstoreProductNo,
  findGroupProductNo,
  findMerchantNo,
  findOriginProductNo,
  isBrandHost,
  isSmartstoreHost,
  mapChannelToOrigin,
  normalizeCapturedHeaders,
  parseSmartstorePage,
  preloadOriginProductNo,
  withPage
} from "../src/lib/smartstore";

describe("isSmartstoreHost", () => {
  it("matches smartstore and brand hosts", () => {
    expect(isSmartstoreHost("smartstore.naver.com")).toBe(true);
    expect(isSmartstoreHost("brand.naver.com")).toBe(true);
    expect(isSmartstoreHost("www.coupang.com")).toBe(false);
  });
});

describe("isBrandHost", () => {
  it("matches brand.naver.com but not smartstore", () => {
    expect(isBrandHost("brand.naver.com")).toBe(true);
    expect(isBrandHost("m.brand.naver.com")).toBe(true);
    expect(isBrandHost("smartstore.naver.com")).toBe(false);
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
    expect(JSON.parse(req.body ?? "")).toEqual({
      checkoutMerchantNo: 520014391,
      originProductNo: 13031957477,
      page: 2,
      pageSize: 20,
      reviewSearchSortType: "REVIEW_RANKING"
    });
  });

  it("uses /n/v1 for brand.naver.com and /i/v1 for smartstore", () => {
    expect(buildQueryPagesRequest("1", "2", 1, 20, "https://brand.naver.com").url).toBe(
      "https://brand.naver.com/n/v1/contents/reviews/query-pages"
    );
    expect(buildQueryPagesRequest("1", "2", 1, 20, "https://m.brand.naver.com").url).toBe(
      "https://m.brand.naver.com/n/v1/contents/reviews/query-pages"
    );
    expect(buildQueryPagesRequest("1", "2", 1, 20, "https://smartstore.naver.com").url).toBe(
      "https://smartstore.naver.com/i/v1/contents/reviews/query-pages"
    );
  });

  it("uses searchSortType for brand pages and reviewSearchSortType for smartstore", () => {
    // 브랜드스토어 프론트는 정렬 필드명이 다르다 (라이브 번들 캡처로 확정).
    const brand = buildQueryPagesRequest("520014391", "12553905334", 1, 20, "https://brand.naver.com");
    expect(JSON.parse(brand.body ?? "")).toEqual({
      checkoutMerchantNo: 520014391,
      originProductNo: 12553905334,
      page: 1,
      pageSize: 20,
      searchSortType: "REVIEW_RANKING"
    });
    const smart = buildQueryPagesRequest("520014391", "12553905334", 1, 20, "https://smartstore.naver.com");
    expect(JSON.parse(smart.body ?? "")).toEqual({
      checkoutMerchantNo: 520014391,
      originProductNo: 12553905334,
      page: 1,
      pageSize: 20,
      reviewSearchSortType: "REVIEW_RANKING"
    });
  });
});

describe("findGroupProductNo", () => {
  it("extracts groupProductNo from group-products review urls", () => {
    const urls = [
      "https://brand.naver.com/n/v1/contents/reviews/group-products/product-summary/50427893?checkoutMerchantNo=510279875",
      "https://brand.naver.com/n/v1/contents/reviews/group-products/gallery-attaches/50427893"
    ];
    expect(findGroupProductNo(urls)).toBe("50427893");
  });
  it("returns null when not a group product", () => {
    expect(findGroupProductNo(["https://brand.naver.com/n/v1/contents/reviews/product-summary/13031957477"])).toBeNull();
  });
});

describe("buildGroupProductReviewRequest", () => {
  it("builds the confirmed brandstore group-product GET (GENERAL=전체)", () => {
    const req = buildGroupProductReviewRequest("510279875", "50427893", 1, 20, "https://brand.naver.com");
    expect(req.method).toBe("GET");
    expect(req.url).toBe(
      "https://brand.naver.com/n/v1/contents/reviews/group-products/product-summary/50427893/reviews/GENERAL" +
        "?checkoutMerchantNo=510279875&searchSortType=REVIEW_RANKING&page=1&pageSize=20"
    );
  });
  it("uses /i/v1 on smartstore", () => {
    const req = buildGroupProductReviewRequest("1", "2", 1, 20, "https://smartstore.naver.com");
    expect(req.url.startsWith("https://smartstore.naver.com/i/v1/contents/reviews/group-products/")).toBe(true);
  });
});

describe("buildProductSummaryReviewRequest", () => {
  it("builds the regular brandstore product-summary GET", () => {
    const req = buildProductSummaryReviewRequest("510279875", "12553905334", 1, 20, "https://brand.naver.com");
    expect(req.method).toBe("GET");
    expect(req.url).toBe(
      "https://brand.naver.com/n/v1/contents/reviews/product-summary/12553905334/reviews/GENERAL" +
        "?checkoutMerchantNo=510279875&searchSortType=REVIEW_RANKING&page=1&pageSize=20"
    );
  });
});

describe("withPage", () => {
  it("overrides page and pageSize in a captured POST body", () => {
    const req = buildQueryPagesRequest("1", "2", 1, 20, "https://brand.naver.com");
    const next = withPage(req, 3, 20);
    const body = JSON.parse(next.body ?? "{}") as Record<string, unknown>;
    expect(body.page).toBe(3);
    expect(body.pageSize).toBe(20);
    expect(body.originProductNo).toBe(2);
    expect(next.url).toBe(req.url);
  });

  it("overrides page/pageSize in the GET query string", () => {
    const req = buildGroupProductReviewRequest("510279875", "50427893", 1, 20, "https://brand.naver.com");
    const next = withPage(req, 4, 20);
    const u = new URL(next.url);
    expect(u.searchParams.get("page")).toBe("4");
    expect(u.searchParams.get("pageSize")).toBe("20");
    expect(u.pathname).toContain("group-products/product-summary/50427893");
  });

  it("survives a non-JSON body", () => {
    const next = withPage({ url: "u", method: "POST", body: "not json" }, 2, 20);
    expect(JSON.parse(next.body ?? "{}")).toEqual({ page: 2, pageSize: 20 });
  });
});

describe("normalizeCapturedHeaders", () => {
  it("keeps auth headers and drops fetch-forbidden ones", () => {
    const out = normalizeCapturedHeaders({
      accept: "application/json",
      "content-type": "application/json",
      "x-client-rtk": "t01:abc",
      "x-client-rts": "123",
      "x-client-version": "20260806113950",
      origin: "https://brand.naver.com",
      cookie: "NID_AUT=xxx",
      "sec-fetch-mode": "cors",
      "proxy-auth": "x"
    });
    expect(out).toEqual({
      accept: "application/json",
      "content-type": "application/json",
      "x-client-rtk": "t01:abc",
      "x-client-rts": "123",
      "x-client-version": "20260806113950"
    });
  });

  it("returns empty for garbage input", () => {
    expect(normalizeCapturedHeaders(null)).toEqual({});
    expect(normalizeCapturedHeaders("nope")).toEqual({});
  });
});

describe("preloadOriginProductNo", () => {
  it("reads simpleProductForDetailPage.productNo (real origin for brand pages)", () => {
    const preload = { simpleProductForDetailPage: { id: 12610726913, productNo: 12553905334 } };
    expect(preloadOriginProductNo(preload)).toBe("12553905334");
  });
  it("returns null when absent", () => {
    expect(preloadOriginProductNo({})).toBeNull();
    expect(preloadOriginProductNo({ simpleProductForDetailPage: { id: 1 } })).toBeNull();
  });
});

describe("mapChannelToOrigin", () => {
  it("maps URL(channel) product no to origin product no", () => {
    const preload = {
      simpleProductForDetailPage: {
        channelProductNos: [12610732905, 12610726913, 12610741878],
        originalProductNos: [12553905334, 12553920277, 12553911325]
      }
    };
    expect(mapChannelToOrigin(preload, "12610726913")).toBe("12553920277");
    expect(mapChannelToOrigin(preload, "999")).toBeNull();
  });

  it("finds the mapping nested under simpleStandardGroupProduct (brandstore layout)", () => {
    const preload = {
      simpleProductForDetailPage: {
        simpleStandardGroupProduct: {
          channelProductNos: [5124199389, 5528848185, 5528856531, 5124199248],
          originalProductNos: [5505434215, 5105316380, 5505425937, 5105316240]
        }
      }
    };
    expect(mapChannelToOrigin(preload, "5124199248")).toBe("5105316240");
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
