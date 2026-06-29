/**
 * 네이버 스마트스토어/브랜드스토어 리뷰 수집 헬퍼 (순수 함수).
 *
 * 라이브 캡처로 확정된 전체-리뷰 목록 API:
 *   POST /i/v1/contents/reviews/query-pages
 *   body: { checkoutMerchantNo, originProductNo, page, pageSize, reviewSearchSortType: "REVIEW_RANKING" }
 *   응답: { contents[], page, size, totalElements, totalPages, last }
 *   리뷰 객체: { reviewScore, reviewContent, createDate(ISO), maskedWriterId, originProductNo, ... }
 *
 * ID 출처(런타임): checkoutMerchantNo 는 페이지가 보낸 요청 URL(resource timing)에,
 * originProductNo 는 리뷰 GET 응답의 리뷰 객체에 들어있다(collect-smartstore 에서 해석).
 */

const SMARTSTORE_HOSTS = /(^|\.)smartstore\.naver\.com$/i;
const BRAND_HOSTS = /(^|\.)brand\.naver\.com$/i;

export function isSmartstoreHost(hostname: string): boolean {
  return SMARTSTORE_HOSTS.test(hostname) || BRAND_HOSTS.test(hostname);
}

/** /{store}/products/{productNo} 에서 URL productNo 추출. */
export function extractSmartstoreProductNo(pathname: string): string | null {
  const m = pathname.match(/\/products\/(\d+)/);
  return m ? m[1] : null;
}

/** checkoutMerchantNo: 페이지가 이미 보낸 리뷰 요청 URL에서 추출(가장 신뢰도 높음), 없으면 preload. */
export function findMerchantNo(resourceUrls: string[], preload?: unknown): string | null {
  for (const u of resourceUrls) {
    const m = u.match(/checkoutMerchantNo=(\d+)/);
    if (m) return m[1];
  }
  return deepFindFirst(preload, ["checkoutMerchantNo", "merchantNo", "storeKeeperNo"]);
}

/**
 * originProductNo: 페이지의 리뷰 요청 URL 경로에서 추출(원본상품번호).
 * 스마트스토어는 채널상품(URL productNo)과 원본상품(originProductNo)이 다를 수 있고,
 * 모든 리뷰 API는 경로에 originProductNo 를 쓴다. 예) /contents/reviews/product-summary/13031957477
 */
export function findOriginProductNo(resourceUrls: string[]): string | null {
  let found: string | null = null;
  for (const u of resourceUrls) {
    const m = u.match(/\/contents\/reviews\/[a-z-]+\/(\d+)/);
    if (m) found = m[1]; // 마지막(가장 최근) 매치 선호
  }
  return found;
}

export type SmartstoreReviewRequest = { url: string; method: "POST"; body: string };

export function buildQueryPagesRequest(
  merchantNo: string,
  originProductNo: string,
  page: number,
  pageSize: number,
  origin = ""
): SmartstoreReviewRequest {
  const body = JSON.stringify({
    checkoutMerchantNo: Number(merchantNo),
    originProductNo: Number(originProductNo),
    page,
    pageSize,
    reviewSearchSortType: "REVIEW_RANKING"
  });
  return { url: `${origin}/i/v1/contents/reviews/query-pages`, method: "POST", body };
}

/** 리뷰 API 응답에서 리뷰 배열/총 개수/총 페이지 추출. */
export function parseSmartstorePage(json: unknown): { contents: unknown[]; total: number; totalPages?: number } {
  const o = (json ?? {}) as Record<string, unknown>;
  const contents = firstArray(o.contents, o.reviews, o.items, o.reviewContents);
  const total = Number(o.totalElements ?? o.totalCount ?? o.total ?? contents.length);
  const totalPagesRaw = Number(o.totalPages);
  return {
    contents,
    total: Number.isFinite(total) ? total : contents.length,
    totalPages: Number.isFinite(totalPagesRaw) && totalPagesRaw > 0 ? totalPagesRaw : undefined
  };
}

function firstArray(...vals: unknown[]): unknown[] {
  for (const v of vals) if (Array.isArray(v)) return v;
  return [];
}

function deepFindFirst(obj: unknown, keys: readonly string[], depth = 0): string | null {
  if (obj == null || depth > 12) return null;
  if (Array.isArray(obj)) {
    for (const v of obj) {
      const found = deepFindFirst(v, keys, depth + 1);
      if (found) return found;
    }
    return null;
  }
  if (typeof obj === "object") {
    const rec = obj as Record<string, unknown>;
    for (const k of keys) {
      const v = rec[k];
      if (typeof v === "string" && /^\d+$/.test(v.trim())) return v.trim();
      if (typeof v === "number" && Number.isFinite(v) && v > 0) return String(v);
    }
    for (const v of Object.values(rec)) {
      const found = deepFindFirst(v, keys, depth + 1);
      if (found) return found;
    }
  }
  return null;
}
