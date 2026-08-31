/**
 * 오늘의집 스토어 리뷰 API (2026-08-31 CDP 라이브 캡처 확정 — brain raw/.../ohou-live.json).
 *
 * 엔드포인트: GET https://store.ohou.se/api/goods/reviews
 *   - page 는 1-based, per 는 페이지 기본값 5 로 실측 (page1/2 각 5건, totalCount 8,022).
 *   - order=best 기본. productionId = goods/{id}.
 *   - 응답 JSON: { reviews:[...], totalCount, reviewStarCount, ... }
 * 동일 오리진(store.ohou.se) — 페이지 쿠키로 CORS 성립.
 */
export function ohouReviewUrl(productionId: string, page1Based: number, per = 5): string {
  const q = new URLSearchParams({
    page: String(page1Based),
    productionId,
    per: String(per),
    order: "best",
    stars: "",
    option: "",
    chips: ""
  });
  return `https://store.ohou.se/api/goods/reviews?${q.toString()}`;
}

export type OhouPage = { contents: unknown[]; totalCount: number };

export function parseOhouPage(json: unknown): OhouPage {
  const reviews = (json as { reviews?: unknown[] })?.reviews;
  const totalCount = Number((json as { totalCount?: unknown })?.totalCount) || 0;
  return {
    contents: Array.isArray(reviews) ? reviews : [],
    totalCount
  };
}

/** 리뷰 이미지: card.imageUrl / card.imgUrl / card.imgUrlPc — 절대 URL(prs.ohouse.com). */
export function ohouImageUrl(raw: unknown): string {
  if (typeof raw !== "string" || !raw) return "";
  if (raw.startsWith("//")) return `https:${raw}`;
  return raw;
}