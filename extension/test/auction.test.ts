// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  AUCTION_REVIEW_ENDPOINT,
  auctionImageUrl,
  auctionReviewBody,
  parseAuctionPage,
  parseAuctionPayload
} from "../src/lib/auction";
import { normalizeAuctionReview } from "../src/lib/normalize";

describe("auctionReviewBody", () => {
  it("builds JSON body with 1-based pageIndex (라이브 캡처 스키마)", () => {
    expect(JSON.parse(auctionReviewBody("F361333759", 2))).toEqual({
      itemNo: "F361333759",
      filterParam: "",
      sort: "popular",
      pageIndex: 2
    });
    expect(AUCTION_REVIEW_ENDPOINT).toContain("ReviewService.asmx/GetReviewList");
  });
});

describe("auctionImageUrl", () => {
  it("strips _thum suffix and upgrades to https (실측: 정본 로드 OK)", () => {
    expect(auctionImageUrl("http://bampic.auction.co.kr/v1/252/580/c337580252/00952/c337580252256930295200_thum.jpg")).toBe(
      "https://bampic.auction.co.kr/v1/252/580/c337580252/00952/c337580252256930295200.jpg"
    );
  });
  it("keeps absolute https and empty inputs", () => {
    expect(auctionImageUrl("https://bampic.auction.co.kr/x.jpg")).toBe("https://bampic.auction.co.kr/x.jpg");
    expect(auctionImageUrl("")).toBe("");
  });
});

describe("parseAuctionPayload + parseAuctionPage", () => {
  it("parses live-capture fragment schema (ul.list__review > li.list-item)", () => {
    // brain raw/.../auction-review-C337580252.json 실측 마크업 구조 재현
    const html = `
      <ul class="list__review">
        <li class="list-item" id="434835598" data-review-seq="434835598">
          <div class="box__review-item">
            <div class="box__content">
              <div class="box__info">
                <div class="box__star">
                  <span class="sprite__vip image__star">
                    <span class="sprite__vip image__star-fill" style="width: 80%"></span>
                    <span class="for-a11y">이용자 평점 4점</span>
                  </span>
                </div>
                <p class="text__writer">200*******</p>
                <p class="text__date">2026.08.27</p>
              </div>
              <div class="text__option">선택 <span class="text__option-selected">000. 에어리밀착스트마스크 / 꿀_20개입 / 110,000원</span></div>
              <div class="box__review-text"><p class="text">빨리  배송과함께  잘  받았습니다</p></div>
              <div class="box__list-thumbnail"><ul class="list">
                <li class="list-item" data-montelena-asn="1">
                  <a href="javascript:;" class="link" style="background-image:url(http://bampic.auction.co.kr/v1/252/580/c337580252/00952/c337580252256930295200_thum.jpg);">
                    <span class="for-a11y"></span>
                  </a>
                </li>
              </ul></div>
            </div>
            <div class="box__helpful">
              <span class="text">도움이 되었나요?</span>
              <button type="button" class="button js-button" data-review-seq="434835598">
                <span class="text__count">3</span>
              </button>
            </div>
          </div>
        </li>
        <li class="list-item" id="434446178" data-review-seq="434446178">
          <div class="box__review-item"><div class="box__content">
            <div class="box__info"><div class="box__star"><span class="sprite__vip image__star"><span class="sprite__vip image__star-fill" style="width: 100%"></span></span></div>
            <p class="text__writer">abc****</p><p class="text__date">2026.08.26</p></div>
            <div class="box__review-text"><p class="text">좋아요</p></div>
          </div></div>
        </li>
        <li class="list-item">no-review-item</li>
      </ul>`;
    const doc = parseAuctionPayload({ d: html });
    expect(doc).not.toBeNull();
    const items = parseAuctionPage(doc!);
    expect(items).toHaveLength(2);
    expect(items[0].reviewId).toBe("434835598");
    expect(items[0].rating).toBe(4); // width 80% → 4점
    expect(items[0].text).toBe("빨리  배송과함께  잘  받았습니다");
    expect(items[0].option).toBe("000. 에어리밀착스트마스크 / 꿀_20개입 / 110,000원");
    expect(items[0].author).toBe("200*******");
    expect(items[0].reviewedAt).toBe("2026.08.27");
    expect(items[0].helpfulCount).toBe(3);
    expect(items[0].images).toEqual(["https://bampic.auction.co.kr/v1/252/580/c337580252/00952/c337580252256930295200.jpg"]);
    expect(items[1].rating).toBe(5);
  });

  it("returns null for malformed payload", () => {
    expect(parseAuctionPayload(null)).toBeNull();
    expect(parseAuctionPayload({ d: "not-html" })).toBeNull();
  });
});

describe("normalizeAuctionReview", () => {
  it("maps parsed fields", () => {
    const r = normalizeAuctionReview({
      text: "좋아요",
      rating: 5,
      author: "abc****",
      reviewedAt: "2026.08.26",
      helpfulCount: 3,
      images: ["https://bampic.auction.co.kr/x.jpg"]
    });
    expect(r.text).toBe("좋아요");
    expect(r.rating).toBe(5);
    expect(r.author).toBe("abc****");
    expect(r.reviewedAt).toMatch(/^2026-08-26T/);
    expect(r.imageUrls).toEqual(["https://bampic.auction.co.kr/x.jpg"]);
  });
});