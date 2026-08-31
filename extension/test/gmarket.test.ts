// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  GMARKET_REVIEW_ENDPOINT,
  GMARKET_REVIEW_SHELL_ENDPOINT,
  gmarketReviewBody,
  parseGmarketPage,
  parseGmarketTotalPages
} from "../src/lib/gmarket";
import { normalizeGmarketReview } from "../src/lib/normalize";

describe("gmarketReviewBody", () => {
  it("builds form body with 1-based pageNo (totalPage 미지정)", () => {
    expect(gmarketReviewBody("4814731104", 3)).toBe("goodsCode=4814731104&pageNo=3");
  });
  it("includes totalPage when known (실측: 누락 시 서버가 연결 reset)", () => {
    expect(gmarketReviewBody("4814731104", 2, 6)).toBe("goodsCode=4814731104&pageNo=2&totalPage=6");
  });
  it("points at the two live endpoints (셸 /Review + 페이지네이션 /Review/Text)", () => {
    expect(GMARKET_REVIEW_SHELL_ENDPOINT).toContain("item.gmarket.co.kr/Review");
    expect(GMARKET_REVIEW_ENDPOINT).toContain("item.gmarket.co.kr/Review/Text");
  });
});

describe("parseGmarketTotalPages", () => {
  it("extracts data-total-page from shell response", () => {
    expect(parseGmarketTotalPages('<div id="text-pagenation-wrap" data-total-page="6">')).toBe(6);
    expect(parseGmarketTotalPages("<html>no marker</html>")).toBeNull();
  });
});

describe("parseGmarketPage", () => {
  it("parses tb_comment rows (라이브 캡처 스키마)", () => {
    const html = `
      <table class="tb_comment"><tbody>
        <tr>
          <td class="comment-content">
            <p class="comment-tit">늘</p>
            <p class="pd-tit">옵션없음</p>
            <p class="con">늘 쓰던제품이에요 다른걸로 바꿔지지않네요</p>
          </td>
          <td class="info"><dl class="writer-info"><dt>작성자 :</dt><dd>jsy****</dd><dt>등록일 :</dt><dd>2026.08.31</dd></dl></td>
        </tr>
        <tr>
          <td class="comment-content"><p class="pd-tit">옵션없음</p><p class="con">굿</p></td>
          <td class="info"><dl class="writer-info"><dt>작성자 :</dt><dd>dms*******</dd><dt>등록일 :</dt><dd>2026.08.30</dd></dl></td>
        </tr>
        <tr><td class="other"><p>not a review</p></td></tr>
      </tbody></table>`;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = parseGmarketPage(doc);
    expect(items).toHaveLength(2);
    expect(items[0].text).toBe("늘 쓰던제품이에요 다른걸로 바꿔지지않네요");
    expect(items[0].title).toBe("늘");
    expect(items[0].option).toBe("옵션없음");
    expect(items[0].author).toBe("jsy****");
    expect(items[0].reviewedAt).toBe("2026.08.31");
  });
});

describe("normalizeGmarketReview", () => {
  it("maps parsed fields (별점 없음 → null)", () => {
    const r = normalizeGmarketReview({ text: "굿", author: "dms*******", reviewedAt: "2026.08.30" });
    expect(r.text).toBe("굿");
    expect(r.rating).toBeNull();
    expect(r.author).toBe("dms*******");
    expect(r.reviewedAt).toMatch(/^2026-08-30T/);
  });
});