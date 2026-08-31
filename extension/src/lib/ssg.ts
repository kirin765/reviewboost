/**
 * SSG닷컴 리뷰 API (2026-08-31 CDP 라이브 캡처 확정 — brain raw/.../ssg-live.json).
 *
 * 엔드포인트: GET https://www.ssg.com/item/ajaxItemCommentList.ssg
 *   - page 는 1-based, pageSize 기본 10 (실측: page1/2/3 각 10건, 작성자 상이).
 *   - QnA(ajaxItemQnaPageList.ssg) 와 같은 파라미터 패밀리. filterCol=10(전체) 고정.
 *   - itemNm 은 상품명(URL 인코딩) — 비어도 동작했으나(실측) 정확도를 위해 페이지의
 *     상품명을 넣는다. canonicalUrl 은 itemView URL.
 *   - 응답: HTML — li.rvw_expansion_panel.v2 목록 (schema.org JSON-LD Review 포함).
 * 동일 오리진(www.ssg.com) — 페이지 쿠키로 CORS 성립.
 */
export function ssgReviewListUrl(
  itemId: string,
  siteNo: string,
  page1Based: number,
  pageSize = 10,
  itemNm = "",
  canonicalUrl = ""
): string {
  const q = new URLSearchParams({
    itemId,
    siteNo,
    filterCol: "10",
    sortCol: "",
    uitemId: "",
    recomAttrGrpId: "",
    recomAttrId: "",
    page: String(page1Based),
    pageSize: String(pageSize),
    oreItemId: "",
    oreItemReviewYn: "N",
    nlpEntyId: "",
    nlpEntySelected: "false",
    dealCmptItemView: "",
    reqFromDealYn: "",
    itemNm,
    canonicalUrl
  });
  return `https://www.ssg.com/item/ajaxItemCommentList.ssg?${q.toString()}`;
}

export type SsgItem = {
  reviewId: string;
  rating: string;
  author: string;
  text: string;
  reviewedAt: string;
  helpfulCount: string;
  images: string[];
};

/** 리뷰 목록 프래그먼트 DOM → 항목 배열. */
export function parseSsgPage(doc: Document): SsgItem[] {
  return Array.from(doc.querySelectorAll("li.rvw_expansion_panel.v2")).map((li) => {
    const idEl = li.getAttribute("data-postngid") || "";
    const ratingEl = li.querySelector(".cdtl_star_area .blind em, .cdtl_star_area em");
    const authorEl = li.querySelector(".rvw_item_user_id");
    const textEl = li.querySelector("p.rvw_item_text");
    const dateEl = li.querySelector(".rvw_item_date");
    const helpfulEl = li.querySelector(".rvw_help_btn span[data-cnt]");
    const images = Array.from(li.querySelectorAll(".rvw_item_thumb_group img"))
      .map((img) => ssgImageUrl(img.getAttribute("src")))
      .filter(Boolean);
    return {
      reviewId: idEl,
      rating: ratingEl?.textContent?.trim() || "",
      author: authorEl?.textContent?.trim() || "",
      text: textEl?.textContent?.trim() || "",
      reviewedAt: dateEl?.textContent?.trim() || "",
      helpfulCount: helpfulEl?.textContent?.trim() || "0",
      images
    };
  });
}

/** SSG 이미지는 protocol-relative(//succ.ssgcdn.com/...) — https 로 확정. */
export function ssgImageUrl(raw: string | null): string {
  if (!raw) return "";
  if (raw.startsWith("https:")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  return "";
}