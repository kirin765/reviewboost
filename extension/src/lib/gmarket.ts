/**
 * G마켓 상품평 API (2026-08-31 CDP 라이브 캡처 확정 — brain raw/.../gmarket-live.json).
 *
 * 엔드포인트: POST https://item.gmarket.co.kr/Review/Text
 *   - body: application/x-www-form-urlencoded — goodsCode={code}&pageNo={1-based}
 *     (pageNo 는 1-based, 프래그먼트의 data-total-page 로 전체 페이지 수 확인 가능).
 *   - 응답: text/html 프래그먼트 — table.tb_comment tbody tr (td.comment-content).
 *   - 프리미엄(포토) 리뷰는 /Review/Premium — v1 은 텍스트 상품평만 수집 (별점·이미지 미포함,
 *     프래그먼트에 리뷰별 별점 없음 — 실측).
 * 동일 오리진(item.gmarket.co.kr) — 페이지 쿠키로 CORS 성립.
 * 주의: 반복 호출 시 서버측 'Failed to fetch'(anti-abuse) 가능성 — 페이지당 지연 유지.
 */
export const GMARKET_REVIEW_ENDPOINT = "https://item.gmarket.co.kr/Review/Text";

export function gmarketReviewBody(goodsCode: string, page1Based: number): string {
  return `goodsCode=${encodeURIComponent(goodsCode)}&pageNo=${page1Based}`;
}

export type GmarketItem = {
  title: string;
  text: string;
  option: string;
  author: string;
  reviewedAt: string;
  images: string[];
};

/** 텍스트 상품평 프래그먼트 DOM → 항목 배열 (작성자/등록일은 dl.writer-info 의 dd 순서). */
export function parseGmarketPage(doc: Document): GmarketItem[] {
  return Array.from(doc.querySelectorAll("tr")).flatMap((tr) => {
    const contentCell = tr.querySelector("td.comment-content");
    if (!contentCell) return [];
    const dds = Array.from(tr.querySelectorAll("td.info dl.writer-info dd")).map(
      (dd) => dd.textContent?.trim() || ""
    );
    return [
      {
        title: contentCell.querySelector(".comment-tit")?.textContent?.trim() || "",
        text: contentCell.querySelector(".con")?.textContent?.trim() || "",
        option: contentCell.querySelector(".pd-tit")?.textContent?.trim() || "",
        author: dds[0] ?? "",
        reviewedAt: dds[1] ?? "",
        images: []
      }
    ];
  });
}