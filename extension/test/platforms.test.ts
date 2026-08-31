import { describe, expect, it } from "vitest";
import { detectPlatform, platformForHost } from "../src/lib/platforms";

// 실측 픽스처 기반 실상품 URL — 각 어댑터 테스트의 캡처와 동일한 ID 사용
const CASES: Array<{ key: string; url: string; productId: string }> = [
  { key: "musinsa", url: "https://www.musinsa.com/products/6254168", productId: "6254168" },
  { key: "29cm", url: "https://www.29cm.co.kr/products/2632177", productId: "2632177" },
  { key: "11st", url: "https://www.11st.co.kr/products/9553196713", productId: "9553196713" },
  { key: "ssg", url: "https://www.ssg.com/item/itemView.ssg?itemId=1000827457933&siteNo=6004", productId: "1000827457933" },
  { key: "ohou", url: "https://store.ohou.se/goods/3609096", productId: "3609096" },
  { key: "gmarket", url: "https://item.gmarket.co.kr/Item?goodsCode=4814731104", productId: "4814731104" },
  { key: "curly", url: "https://www.kurly.com/goods/1002458801", productId: "1002458801" },
  { key: "auction", url: "https://www.auction.co.kr/DetailView.aspx?itemno=C337580252", productId: "C337580252" }
];

describe("detectPlatform (스킴 없는 hostname 이 new URL 에서 throw 하던 버그 회귀 방지)", () => {
  for (const c of CASES) {
    it(`${c.key}: ${c.url}`, () => {
      const hit = detectPlatform(c.url);
      expect(hit).not.toBeNull();
      expect(hit!.platform.key).toBe(c.key);
      expect(hit!.productId).toBe(c.productId);
    });
  }

  it("스킴 없는 hostname 도 platformForHost 가 매칭한다 (bareHost 회귀)", () => {
    expect(platformForHost("www.musinsa.com")?.key).toBe("musinsa");
    expect(platformForHost("store.ohou.se")?.key).toBe("ohou");
    expect(platformForHost("item.gmarket.co.kr")?.key).toBe("gmarket");
    expect(platformForHost("api.kurly.com")?.key).toBe("curly");
  });

  it("미지원/비상품 URL 은 null", () => {
    expect(detectPlatform("https://www.naver.com/news/123")).toBeNull();
    expect(detectPlatform("https://www.musinsa.com/")).toBeNull();
    expect(detectPlatform("https://www.11st.co.kr/category")).toBeNull();
  });
});