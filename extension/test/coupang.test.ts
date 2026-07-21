import { describe, expect, it } from "vitest";
import { coupangReviewApiUrl, extractCoupangProductId, parseCoupangPage } from "../src/lib/coupang";

describe("extractCoupangProductId", () => {
  it("parses /vp/products/{id}", () => {
    expect(extractCoupangProductId("https://www.coupang.com/vp/products/123456?itemId=1")).toBe("123456");
  });
  it("parses /products/{id}", () => {
    expect(extractCoupangProductId("https://www.coupang.com/products/789")).toBe("789");
  });
  it("parses mobile path", () => {
    expect(extractCoupangProductId("https://m.coupang.com/vm/products/555")).toBe("555");
  });
  it("rejects non-coupang host", () => {
    expect(extractCoupangProductId("https://www.naver.com/vp/products/1")).toBeNull();
  });
  it("rejects non-url and non-product", () => {
    expect(extractCoupangProductId("not a url")).toBeNull();
    expect(extractCoupangProductId("https://www.coupang.com/np/categories/1")).toBeNull();
  });
});

describe("coupangReviewApiUrl", () => {
  it("builds the internal review endpoint", () => {
    const url = coupangReviewApiUrl("123", 2);
    expect(url).toContain("productId=123");
    expect(url).toContain("page=2");
    expect(url).toContain("size=10");
    expect(url).toContain("sortBy=ORDER_SCORE_ASC");
  });
});

describe("parseCoupangPage", () => {
  it("extracts contents and totalPage", () => {
    const r = parseCoupangPage({ rData: { paging: { contents: [{}, {}], totalPage: 5 } } });
    expect(r.contents).toHaveLength(2);
    expect(r.totalPage).toBe(5);
  });
  it("defaults safely on empty", () => {
    const r = parseCoupangPage({});
    expect(r.contents).toEqual([]);
    expect(r.totalPage).toBe(1);
  });
});
