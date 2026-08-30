/**
 * 29CM 리뷰 API (2026-08-30 라이브 캡처 확정).
 *
 * 엔드포인트: https://review-api.29cm.co.kr/api/v4/reviews?itemId={id}&page={page}&size={size}&sort=BEST
 *   - page 는 0-based, size 기본 20 (`sort` 생략 시 기본 정렬, BEST=베스트순).
 *   - 응답: { result:"SUCCESS", data:{ count, giftCount, averagePoint, results:[...] } }
 *   - 리뷰 항목 실측 키: contents(본문) · point(1~5) · insertTimestamp("YYYY-MM-DD HH:mm:ss") ·
 *     userId(마스킹) · helpfulCount · uploadFiles[{url:"/next-product/..."}] ·
 *     optionValue[] · partnerComment(판매자 답글).
 *   - 같은 호스트의 photo 엔드포인트(api/v4/reviews/photo)는 무시 — results 와 중복된다.
 * 크로스 오리진: review-api.29cm.co.kr ≠ www.29cm.co.kr 이지만 페이지가 직접 호출하므로
 * CORS(페이지 origin 허용)가 성립하고, content script fetch 는 페이지 origin 으로 나간다.
 */

const API_BASE = "https://review-api.29cm.co.kr/api/v4/reviews";
const IMAGE_CDN = "https://cdn.29cm.co.kr"; // ⚠️추정 — uploadFiles.url 의 상대경로 기준 호스트 미검증

export function twentyNineReviewApiUrl(itemId: string, page0Based: number, size = 20): string {
  const q = new URLSearchParams({
    itemId: itemId,
    page: String(page0Based),
    size: String(size),
    sort: "BEST"
  });
  return `${API_BASE}?${q.toString()}`;
}

export type TwentyNinePage = { contents: unknown[]; totalCount: number };

export function parseTwentyNinePage(json: unknown): TwentyNinePage {
  const data = (json as { data?: { results?: unknown[]; count?: number } })?.data;
  return {
    contents: Array.isArray(data?.results) ? data!.results! : [],
    totalCount: Number(data?.count) || 0
  };
}

/** uploadFiles[].url 은 "/next-product/..." 상대경로 → CDN 절대 URL. */
export function twentyNineImageUrl(rawUrl: unknown): string {
  if (typeof rawUrl !== "string" || !rawUrl) return "";
  if (rawUrl.startsWith("http")) return rawUrl;
  if (rawUrl.startsWith("//")) return `https:${rawUrl}`;
  if (rawUrl.startsWith("/")) return `${IMAGE_CDN}${rawUrl}`;
  return rawUrl;
}