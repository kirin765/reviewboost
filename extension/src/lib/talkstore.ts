import { CollectError } from "./types";

/**
 * 톡스토어(카카오톡 스토어) 상품 URL 파싱 + 내부 리뷰 API (순수 함수).
 *
 * [실측 2026-10-14] 상품 페이지는 store.kakao.com/{store}/products/{id} 형태이고,
 * 리뷰는 페이지와 같은 오리진(store.kakao.com)의 JSON API 로 온다 —
 * content script(페이지 origin) fetch 로 수집 가능(별도 크로스오리진 권한 불필요).
 * page 는 0-based, size 는 100까지 허용(실측), 전체 리뷰가 중간 한도 없이
 * 마지막 페이지까지 노출된다(표시 7,943개 상품에서 실측).
 *
 * 별도 주의: 톡스토어 별점은 4점 척도다 — 4=매우 만족, 3=만족, 2=아쉬움,
 * 1=매우 아쉬움. 내보내기·분석이 쓰는 공용 5점 척도로 의미를 보존해 변환한다.
 */

const TALKSTORE_HOST = /(^|\.)store\.kakao\.com$/i;

export type TalkstoreSort = "RECOMMENDATION_SCORE" | "CREATED_AT_LATEST";
export type TalkstoreFilter = "ALL" | "IMAGE";

/** 상품 URL → { store, productId } (store 슬러그는 리뷰 API 경로에 필요). 비-상품이면 null. */
export function extractTalkstoreProduct(rawUrl: string): { store: string; productId: string } | null {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!TALKSTORE_HOST.test(u.hostname)) return null;
  // [실측] /{store}/products/{id} — 검색·번들(/bundles) 등 하위 경로는 상품 상세가 아니다.
  const m = u.pathname.match(/^\/([A-Za-z0-9_-]+)\/products\/(\d+)\/?$/);
  return m ? { store: m[1], productId: m[2] } : null;
}

/** 리뷰 API URL. page 는 0-based — 공통 paginate(1-based) 호출부에서 -1 해서 넘긴다. */
export function talkstoreReviewApiUrl(
  store: string,
  productId: string,
  page: number,
  size: number,
  sort: TalkstoreSort = "RECOMMENDATION_SCORE",
  filter: TalkstoreFilter = "ALL"
): string {
  return (
    `/a/f-m/${encodeURIComponent(store)}/products/${encodeURIComponent(productId)}/reviews` +
    `?page=${page}&productDetailReviewFilter=${filter}&productDetailReviewSort=${sort}&size=${size}&mask=false`
  );
}

/** 리뷰 API 응답 → 리뷰 배열·마지막 페이지 여부·표시 총수. 형식이 바뀌면 UNSUPPORTED. */
export function parseTalkstorePage(json: unknown): {
  contents: Record<string, unknown>[];
  last: boolean;
  totalCount: number;
} {
  const root = json as
    | { result?: unknown; data?: { contents?: unknown; last?: unknown; totalCount?: unknown } }
    | null;
  if (root?.result !== true || !root.data || !Array.isArray(root.data.contents) || typeof root.data.last !== "boolean") {
    throw new CollectError("UNSUPPORTED", "톡스토어 리뷰 응답을 읽을 수 없습니다.");
  }
  const contents = root.data.contents;
  if (!contents.every((r) => r && typeof r === "object" && !Array.isArray(r))) {
    throw new CollectError("UNSUPPORTED", "톡스토어 리뷰 형식이 변경되었습니다.");
  }
  const totalCount = Number(root.data.totalCount);
  return {
    contents: contents as Record<string, unknown>[],
    last: root.data.last,
    totalCount: Number.isFinite(totalCount) && totalCount >= 0 ? totalCount : 0
  };
}

/** 톡스토어 4점 척도 → 공용 5점 척도 (의미 보존): 4→5, 3→4, 2→2, 1→1. 그 외 null. */
const RATING_TO_FIVE: Record<number, number> = { 1: 1, 2: 2, 3: 4, 4: 5 };

export function talkstoreRatingToFive(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isInteger(n)) return null;
  return RATING_TO_FIVE[n] ?? null;
}

/** createdAt "YYYYMMDDHHmmss" (KST) → ISO. 실패 시 null. */
export function talkstoreCreatedAt(value: unknown): string | null {
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(
    typeof value === "string" ? value.trim() : ""
  );
  if (!m) return null;
  const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}+09:00`);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

/** 리뷰 첨부 이미지 URL (imageViews[].originUrl — 실측). http(s)만 허용. */
export function talkstoreImageUrl(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  let url = value.trim();
  if (url.startsWith("//")) url = `https:${url}`;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : "";
  } catch {
    return "";
  }
}
