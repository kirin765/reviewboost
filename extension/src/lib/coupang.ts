/** 쿠팡 상품 URL 파싱 + 내부 리뷰 API URL 빌더 (순수 함수). */

const COUPANG_HOST = /(^|\.)coupang\.com$/i;

/** 쿠팡 상품 URL에서 productId 추출. 비-쿠팡/비-상품이면 null. */
export function extractCoupangProductId(rawUrl: string): string | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!COUPANG_HOST.test(u.hostname)) return null;
  // /vp/products/123 또는 /products/123
  const m = u.pathname.match(/\/(?:vp\/)?products\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * 쿠팡 내부 리뷰 API. crawler-server/src/crawler.js 와 동일한 형태.
 * size=10 유지(50은 차단됨). 페이지 origin에서 same-origin 으로 호출한다.
 */
export function coupangReviewApiUrl(productId: string, page: number, size = 10): string {
  return (
    `/next-api/review?productId=${encodeURIComponent(productId)}&page=${page}&size=${size}` +
    `&sortBy=ORDER_SCORE_ASC&ratingSummary=false&ratings=&market=`
  );
}

/** 쿠팡 리뷰 API 응답에서 리뷰 배열과 총 페이지 수 추출. */
export function parseCoupangPage(json: unknown): { contents: unknown[]; totalPage: number } {
  const paging =
    (json as { rData?: { paging?: { contents?: unknown[]; totalPage?: number } } })?.rData?.paging;
  const contents = Array.isArray(paging?.contents) ? paging!.contents! : [];
  const totalPage = Number(paging?.totalPage);
  return { contents, totalPage: Number.isFinite(totalPage) ? totalPage : 1 };
}
