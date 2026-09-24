// @vitest-environment jsdom
// @vitest-environment-options {"url":"https://www.coupang.com/vp/products/9523158816"}
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContentRequest, PongResponse } from "../src/lib/messages";
import { reviewsToCsv } from "../src/lib/csv";

describe("Coupang product context exported to files", () => {
  let listener: (req: ContentRequest, sender: unknown, respond: (msg: PongResponse) => void) => void;
  beforeEach(async () => {
    vi.resetModules();
    document.head.innerHTML = "<title>쿠팡!</title>";
    document.body.innerHTML = "";
    vi.stubGlobal("chrome", { runtime: { onMessage: { addListener: vi.fn(fn => { listener = fn; }) } } });
    await import("../src/content/index");
  });
  afterEach(() => vi.unstubAllGlobals());
  const context = () => {
    let response!: PongResponse;
    listener({ type: "PING" }, {}, msg => { response = msg; });
    return response.ctx;
  };
  it.each(["쿠팡!", "쿠팡", "Access Denied", ""])("does not turn generic/access-denied title %j into a product name", title => {
    document.title = title;
    document.body.textContent = "요청하신 페이지의 사용권한이 없습니다.";
    const ctx = context();
    expect(ctx.title).toBe("");
    const csv = reviewsToCsv([{ text: "가상 리뷰", rating: 5 }], { productNo: ctx.productId, productTitle: ctx.title });
    expect(csv.split("\r\n")[1].split(",").slice(0, 2)).toEqual(["9523158816", ""]);
  });
  it("reads a product heading even when the document title is generic", () => {
    document.body.innerHTML = '<h1 class="prod-buy-header__title">가상 충전 케이블</h1>';
    expect(context().title).toBe("가상 충전 케이블");
  });
  it("falls back to product metadata and removes only the marketplace suffix", () => {
    document.head.innerHTML += '<meta property="og:title" content="가상 케이블 - 2개 | 쿠팡!">';
    expect(context().title).toBe("가상 케이블 - 2개");
  });
  it("keeps a specific document title when metadata is absent", () => {
    document.title = "가상 충전 케이블 - 쿠팡!";
    expect(context().title).toBe("가상 충전 케이블");
  });
  it("does not mistake a recommendation heading for the product title", () => {
    document.body.innerHTML = '<h1>추천 상품</h1>';
    expect(context().title).toBe("");
  });
  it("reads updated metadata on the next PING after page hydration", () => {
    expect(context().title).toBe("");
    document.head.innerHTML += '<meta property="og:title" content="늦게 로드된 상품">';
    expect(context().title).toBe("늦게 로드된 상품");
  });

});
