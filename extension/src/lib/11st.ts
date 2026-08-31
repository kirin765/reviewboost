/**
 * 11번가 리뷰 API (2026-08-31 CDP 라이브 캡처 확정 — brain raw/review-platform-capture-2026-08-30/11st-live.json).
 *
 * 엔드포인트: GET https://www.11st.co.kr/products/{prdNo}/review-list
 *   - pageNo 는 1-based, pageSize 기본 10 (실측: page1=10건, page2=3건, page3=0건).
 *   - 나머지 파라미터는 페이지의 product.review.js(getReviewList) 와 동일하게 전달.
 *   - 응답: text/html 프래그먼트 — ul.area_list > li.review_list_element.
 *   - 리뷰 iframe(review-frame) 은 navigation-mode 에서만 렌더링되고 fetch(XHR)는 빈 셸
 *     을 주므로 사용 금지 — review-list XHR 을 사용한다 (실측).
 * 동일 오리진(www.11st.co.kr) — 페이지 쿠키로 CORS 성립.
 */

export function elevenStreetReviewUrl(prdNo: string, page1Based: number, pageSize = 10): string {
  const q = new URLSearchParams({
    pageSize: String(pageSize),
    pageNo: String(page1Based),
    myProduct: "false",
    pntVals: "",
    rtype: "",
    sortType: "",
    kkukNo: "0",
    martProduct: "false"
  });
  return `https://www.11st.co.kr/products/${prdNo}/review-list?${q.toString()}`;
}

export type ElevenStreetItem = {
  text: string;
  rating: string;
  reviewedAt: string;
  author: string;
  reviewId: string;
  helpfulCount: string;
  images: string[];
};

/** 리뷰 프래그먼트 DOM → 항목 배열. 본문의 \u00A0(11번가 특이) 를 일반 공백으로 치환. */
export function parseElevenStreetPage(doc: Document): ElevenStreetItem[] {
  return Array.from(doc.querySelectorAll("li.review_list_element")).map((li) => {
    const nameEl = li.querySelector("dt.name");
    const gradeEl = li.querySelector("p.grade em");
    const textEl = li.querySelector(".cont_review_hide, .cont_text_wrap p");
    const dateEl = li.querySelector("p.side .date");
    const reportBtn = li.querySelector(".review-report");
    const kkukEl = li.querySelector("button.kkuk i, button.kkuk span + i");
    const images = Array.from(li.querySelectorAll("img"))
      .map((img) => img.getAttribute("src") || "")
      .filter(Boolean);
    return {
      text: (textEl?.textContent ?? "").replace(/\u00A0/g, " ").trim(),
      rating: gradeEl?.textContent?.trim() || "",
      reviewedAt: dateEl?.textContent?.trim() || "",
      author: nameEl?.getAttribute("data-nick") || nameEl?.textContent?.trim() || "",
      reviewId: reportBtn?.getAttribute("data-contno") || "",
      helpfulCount: kkukEl?.textContent?.trim() || "0",
      images
    };
  });
}