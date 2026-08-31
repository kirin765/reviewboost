// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { elevenStreetReviewUrl, parseElevenStreetPage } from "../src/lib/11st";
import { normalize11stReview } from "../src/lib/normalize";

describe("elevenStreetReviewUrl", () => {
  it("builds 1-based page URL with pageSize", () => {
    const url = elevenStreetReviewUrl("9553196713", 2);
    expect(url).toContain("/products/9553196713/review-list");
    expect(url).toContain("pageNo=2");
    expect(url).toContain("pageSize=10");
  });
});

describe("parseElevenStreetPage", () => {
  it("parses review_list_element fragment (라이브 캡처 스키마)", () => {
    const html = `
      <ul class="area_list">
        <li class="review_list_element" data-productno="9553196713">
          <dl class="c_product_reviewer"><dt class="name" data-nick="mobi****************">mobi****************</dt></dl>
          <div class="c_product_review_cont">
            <p class="grade"><span class="c_seller_grade grade_80"><span>평점 별 5점 중</span><em>4</em></span></p>
            <div class="cont"><div class="cont_text_wrap"><p class="cont_review_hide">버거킹을&nbsp;저렴한&nbsp;가격에&nbsp;살수&nbsp;있어&nbsp;좋아요</p></div></div>
            <p class="side"><span class="date">2026.08.31</span><button class="review-report" data-contno="260964199">신고</button></p>
          </div>
          <p class="c_product_review_btn"><button class="kkuk"><span>꾹</span><i id="kkukCount547718706">0</i></button></p>
        </li>
      </ul>`;
    const doc = new DOMParser().parseFromString(html, "text/html");
    const items = parseElevenStreetPage(doc);
    expect(items).toHaveLength(1);
    expect(items[0].text).toBe("버거킹을 저렴한 가격에 살수 있어 좋아요"); // \u00A0 치환
    expect(items[0].rating).toBe("4");
    expect(items[0].author).toBe("mobi****************");
    expect(items[0].reviewedAt).toBe("2026.08.31");
    expect(items[0].reviewId).toBe("260964199");
  });
  it("returns empty when no elements", () => {
    const doc = new DOMParser().parseFromString("<div></div>", "text/html");
    expect(parseElevenStreetPage(doc)).toEqual([]);
  });
});

describe("normalize11stReview", () => {
  it("maps parsed fields to RawReview", () => {
    const r = normalize11stReview({
      text: "좋아요",
      rating: "4",
      reviewedAt: "2026.08.31",
      author: "mobi********",
      helpfulCount: "3",
      images: ["https://cdn.11st.co.kr/a.jpg"]
    });
    expect(r.text).toBe("좋아요");
    expect(r.rating).toBe(4);
    expect(r.reviewedAt).toMatch(/^2026-08-31T/);
    expect(r.author).toBe("mobi********");
    expect(r.helpfulCount).toBe(3);
    expect(r.imageUrls?.[0]).toContain("11st.co.kr");
  });
  it("tolerates missing fields", () => {
    const r = normalize11stReview({});
    expect(r.text).toBe("");
    expect(r.rating).toBeNull();
  });
});