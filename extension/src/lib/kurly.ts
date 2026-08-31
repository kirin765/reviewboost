/**
 * 컬리 상품 후기 API (2026-08-31 CDP 라이브 캡처 확정 — brain raw/.../kurly-live.json).
 *
 * 엔드포인트: GET https://api.kurly.com/product-review/v4/contents-products/{goodsNo}/reviews
 *   - sortType=RECOMMEND|RECENTLY, size(기본 10 실측), onlyImage=false.
 *   - 페이지네이션: 커서 기반 — 응답 data.nextCursor.after 를 다음 요청의 `after` 파라미터로.
 *     after === "0_0" 또는 reviews 빈 배열이면 종료 (kurly JS chunk 실측).
 *   - 응답 JSON: { data:{ reviews:[...], nextCursor:{ after } } }
 * 크로스 오리진(api.kurly.com ≠ www.kurly.com) — 페이지가 직접 호출하므로 CORS 성립.
 * host_permissions 에 api.kurly.com 추가 필요.
 */
export function kurlyReviewUrl(
  goodsNo: string,
  size = 10,
  sortType = "RECOMMEND",
  onlyImage = false,
  after = ""
): string {
  const q = new URLSearchParams({
    sortType,
    size: String(size),
    onlyImage: String(onlyImage)
  });
  if (after) q.set("after", after);
  return `https://api.kurly.com/product-review/v4/contents-products/${goodsNo}/reviews?${q.toString()}`;
}

export type KurlyPage = { contents: unknown[]; nextCursor: string };

export function parseKurlyPage(json: unknown): KurlyPage {
  const data = (json as { data?: { reviews?: unknown[]; nextCursor?: { after?: string } } })?.data;
  const after = data?.nextCursor?.after;
  return {
    contents: Array.isArray(data?.reviews) ? data!.reviews! : [],
    nextCursor: typeof after === "string" && after !== "0_0" ? after : ""
  };
}