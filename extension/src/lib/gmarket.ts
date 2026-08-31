/**
 * G마켓 상품평 API (실측 갱신 2026-08-31 후속 세션 — 사이트가 /Review 셸 + /Review/Text 페이지네이션으로 변경).
 *
 * 확인된 요청 흐름 (브라우저 Review.js + 라이브 가로채기 검증):
 *   1. 최초 로드:  POST /Review      body goodsCode={code}   → 셸(프리미엄 박스 + 텍스트 1페이지), data-total-page 포함
 *   2. 2페이지+:   POST /Review/Text body goodsCode={code}&pageNo={1-based}&totalPage={M}
 *      - ⚠️ totalPage 누락 시 서버가 TCP 연결을 reset → fetch 가 'Failed to fetch' 로 실패 (실측 2026-08-31)
 *   - 응답: text/html 프래그먼트 — table.tb_comment tbody tr (td.comment-content), 페이지당 10행.
 *   - 프리미엄(포토) 리뷰는 /Review/Premium — v1 은 텍스트 상품평만 수집 (별점·이미지 미포함, 실측).
 * 동일 오리진(item.gmarket.co.kr) — 페이지 쿠키로 CORS 성립.
 * 주의: 반복 호출 시 서버측 'Failed to fetch'(anti-abuse) 가능성 — 페이지당 지연 유지.
 */
export const GMARKET_REVIEW_SHELL_ENDPOINT = "https://item.gmarket.co.kr/Review";
export const GMARKET_REVIEW_ENDPOINT = "https://item.gmarket.co.kr/Review/Text";

export function gmarketReviewBody(goodsCode: string, page1Based: number, totalPage?: number): string {
  const params = [`goodsCode=${encodeURIComponent(goodsCode)}`, `pageNo=${page1Based}`];
  if (totalPage != null) params.push(`totalPage=${totalPage}`);
  return params.join("&");
}

/** 셸 응답에서 전체 페이지 수 추출 (data-total-page, 실측). */
export function parseGmarketTotalPages(html: string): number | null {
  const m = /data-total-page="?(\d+)/.exec(html);
  return m ? Number(m[1]) : null;
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