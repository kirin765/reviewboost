/**
 * 옥션 리뷰 API (2026-08-31 CDP 라이브 캡처 확정 — brain raw/.../auction-review-C337580252.json).
 *
 * 엔드포인트: POST https://itempage3.auction.co.kr/WebService/ReviewService.asmx/GetReviewList
 *   - body: JSON — {"itemNo":"{itemno}","filterParam":"","sort":"popular","pageIndex":{1-based}}
 *     · filterParam 은 페이지가 보내는 ".useruniqueid-{cguid}" (쿠키 cguid) 이지만,
 *       빈 문자열("")로도 200 응답 — 실측(2026-08-31). 누락 시 500.
 *     · pageIndex 는 1-based (실측: page1/2/3 각각 19건, 항목 고유).
 *   - 응답: JSON {"d":"<html fragment>"} — .d 안에 ul.list__review > li.list-item.
 *   - 리뷰 위치: 리뷰보기 탭 클릭 시 GET detail 의 #divVipReview 로드 (실측).
 * 동일 오리진(itempage3.auction.co.kr) — 페이지 쿠키(cguid)로 CORS 성립.
 * 호스트는 itempage / itempage2 / itempage3 가 있을 수 있어 페이지 오리진 기준 호출 권장
 * (아래 AUCTION_REVIEW_ENDPOINT 는 확정 실측 호스트 기준).
 */
export const AUCTION_REVIEW_ENDPOINT = "https://itempage3.auction.co.kr/WebService/ReviewService.asmx/GetReviewList";

export function auctionReviewBody(itemNo: string, page1Based: number): string {
  return JSON.stringify({ itemNo, filterParam: "", sort: "popular", pageIndex: page1Based });
}

export type AuctionItem = {
  reviewId: string;
  rating: number; // 스프라이트 fill width 20% = 1점 (실측 80% → 4점)
  text: string;
  option: string;
  author: string;
  reviewedAt: string;
  helpfulCount: number;
  images: string[];
};

/** 썸네일 URL(http://bampic.auction.co.kr/..._thum.jpg) → 정본 https (실측: _thum 제거 .jpg 유지, https 로드 OK). */
export function auctionImageUrl(raw: string): string {
  const s = raw.trim();
  if (!s) return "";
  let url = s.replace(/_thum\.jpg$/i, ".jpg");
  if (url.startsWith("//")) url = `https:${url}`;
  else if (url.startsWith("http://")) url = `https://${url.slice(7)}`;
  return url;
}

/** 응답 JSON {"d":"<html>"} → DOMParser 로 파싱된 Document. 방어적(null/오형태). */
export function parseAuctionPayload(json: unknown): Document | null {
  try {
    const obj = json as { d?: string };
    if (typeof obj?.d !== "string" || !obj.d.includes("<")) return null;
    return new DOMParser().parseFromString(obj.d, "text/html");
  } catch {
    return null;
  }
}

/** 리뷰 프래그먼트 DOM → 항목 배열 (li.list-item[data-review-seq] + box__review-item). */
export function parseAuctionPage(doc: Document): AuctionItem[] {
  return Array.from(doc.querySelectorAll("li.list-item[data-review-seq]")).flatMap((li) => {
    const reviewItem = li.querySelector(".box__review-item");
    if (!reviewItem) return [];
    const starFill = reviewItem.querySelector(".image__star-fill");
    const starWidth = starFill?.getAttribute("style")?.match(/width:\s*(\d+)%/)?.[1];
    const optionEl = reviewItem.querySelector(".text__option-selected");
    const textEl = reviewItem.querySelector(".box__review-text .text");
    const helpfulEl = reviewItem.querySelector(".box__helpful .text__count");
    const images = Array.from(reviewItem.querySelectorAll(".box__list-thumbnail a.link"))
      .map((a) => {
        const m = a.getAttribute("style")?.match(/background-image:\s*url\(['"]?([^'")]+)['"]?\)/);
        return m ? auctionImageUrl(m[1]) : "";
      })
      .filter(Boolean);
    const writerEl = reviewItem.querySelector(".text__writer");
    const dateEl = reviewItem.querySelector(".text__date");
    return [
      {
        reviewId: li.getAttribute("data-review-seq") || "",
        rating: starWidth ? Math.round(Number(starWidth) / 20) : 0,
        text: textEl?.textContent?.trim() || "",
        option: optionEl?.textContent?.trim() || "",
        author: writerEl?.textContent?.trim() || "",
        reviewedAt: dateEl?.textContent?.trim() || "",
        helpfulCount: Number(helpfulEl?.textContent?.trim() || "0") || 0,
        images
      }
    ];
  });
}