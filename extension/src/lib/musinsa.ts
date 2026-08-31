/**
 * 무신사 리뷰 API (2026-08-31 CDP 라이브 캡처 확정 — brain raw/.../musinsa-live.json).
 *
 * 엔드포인트: GET https://goods.musinsa.com/api2/review/v1/view/list
 *   - page 는 0-based (29CM 과 동일 패턴), pageSize 기본 10 (실측: page0=10건, page1=10건).
 *   - sort=up_cnt_desc(도움순) 고정, selectedSimilarNo=goodsNo.
 *   - 응답 JSON: { data:{ list:[...], total, page } }  (total = 전체 건수)
 *   - 상품 URL: https://www.musinsa.com/products/{goodsNo} (2026-08-31 실측 — /goods/ 아님)
 * 크로스 오리진(goods.musinsa.com ≠ www.musinsa.com) — 페이지가 직접 호출하므로
 * CORS 성립. host_permissions 에 goods.musinsa.com 추가 필요.
 */
export function musinsaReviewUrl(goodsNo: string, page0Based: number, pageSize = 10): string {
  const q = new URLSearchParams({
    page: String(page0Based),
    pageSize: String(pageSize),
    goodsNo,
    sort: "up_cnt_desc",
    selectedSimilarNo: goodsNo,
    myFilter: "false",
    hasPhoto: "false"
  });
  return `https://goods.musinsa.com/api2/review/v1/view/list?${q.toString()}`;
}

export type MusinsaPage = { contents: unknown[]; totalCount: number };

export function parseMusinsaPage(json: unknown): MusinsaPage {
  const data = (json as { data?: { list?: unknown[]; total?: number } })?.data;
  return {
    contents: Array.isArray(data?.list) ? data!.list! : [],
    totalCount: Number(data?.total) || 0
  };
}

const MUSINSA_IMAGE_BASE = "https://image.msscdn.net"; // [실측 2026-08-31] 리뷰 이미지 CDN 호스트 — 상품 페이지가 /data/estimate/{no}/... 를 image.msscdn.net(thumbnails/data/estimate) 에서 로드(10건 캡처). image.musinsa.com 도 동작하지만 사이트는 msscdn.net 사용.

/** images[].imageUrl 은 "/data/estimate/..." 상대경로 — CDN 절대 URL. */
export function musinsaImageUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  if (raw.startsWith("http")) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `${MUSINSA_IMAGE_BASE}${raw}`;
  return raw;
}