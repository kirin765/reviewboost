/**
 * 네이버 스마트스토어/브랜드스토어 리뷰 수집 헬퍼 (순수 함수).
 *
 * 라이브 캡처로 확정된 전체-리뷰 목록 API:
 *   POST /i/v1/contents/reviews/query-pages        (smartstore.naver.com)
 *   POST /n/v1/contents/reviews/query-pages        (brand.naver.com)
 *   body: { checkoutMerchantNo, originProductNo, page, pageSize, sort }
 *   응답: { contents[], page, size, totalElements, totalPages, last }
 *   리뷰 객체: { reviewScore, reviewContent, createDate(ISO), maskedWriterId, originProductNo, ... }
 *
 * 브랜드스토어 프론트(brandstore)는 본문의 정렬 필드명이 다르다:
 *   smartstore → reviewSearchSortType, brandstore → searchSortType
 * (브랜드스토어 번들에서 reviewSearchSortType 은 전혀 등장하지 않고,
 *  리뷰 GET/POST 모든 엔드포인트가 searchSortType 을 쓴다. 2026-08 라이브 확인)
 *
 * ID 출처(런타임):
 * - checkoutMerchantNo: 페이지가 보낸 리뷰 요청 URL(resource timing)의 쿼리.
 *   브랜드스토어의 __PRELOADED_STATE__ 에는 merchant 번호가 없다 (gallery-attaches /
 *   product-summary GET 에만 checkoutMerchantNo= 가 붙는다).
 * - originProductNo: 리뷰 GET 경로(gallery-attaches/{origin}) 또는 preload 의
 *   simpleProductForDetailPage.productNo (브랜드스토어는 URL productNo 가
 *   채널상품번이라 원본상품번과 다르다).
 */

const SMARTSTORE_HOSTS = /(^|\.)smartstore\.naver\.com$/i;
const BRAND_HOSTS = /(^|\.)brand\.naver\.com$/i;

/** 스킴/경로를 떼고 호스트명만 (origin 전체 문자열에서도 동작). */
function bareHost(h: string): string {
  return h.replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0].toLowerCase();
}

export function isSmartstoreHost(hostname: string): boolean {
  return SMARTSTORE_HOSTS.test(bareHost(hostname)) || BRAND_HOSTS.test(bareHost(hostname));
}

/** brand.naver.com(브랜드스토어) 여부 — 요청 본문/경로가 일반 스마트스토어와 다르다. */
export function isBrandHost(hostname: string): boolean {
  return BRAND_HOSTS.test(bareHost(hostname));
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
 * originProductNo: 리뷰 요청 URL 경로에서 추출(원본상품번호).
 * 스마트스토어/브랜드스토어는 채널상품(URL productNo)과 원본상품(originProductNo)이 다를 수 있고,
 * 모든 리뷰 API는 경로에 originProductNo 를 쓴다. gallery-attaches/product-summary 가
 * 원본상품 기준이라 이 두 엔드포인트만 매치한다 (query-pages 등 다른 경로는 제외).
 */
export function findOriginProductNo(resourceUrls: string[]): string | null {
  let found: string | null = null;
  for (const u of resourceUrls) {
    const m = u.match(/\/contents\/reviews\/(?:gallery-attaches|product-summary)\/(\d+)/);
    if (m) found = m[1]; // 마지막(가장 최근) 매치 선호
  }
  return found;
}

/**
 * 브랜드스토어 preload 의 simpleProductForDetailPage.productNo → originProductNo.
 * 브랜드스토어는 URL productNo(=채널상품번) ≠ 원본상품번 이라 preload 우회가 필수다.
 */
export function preloadOriginProductNo(preload: unknown): string | null {
  const root = (preload ?? {}) as Record<string, unknown>;
  const spd = root.simpleProductForDetailPage as Record<string, unknown> | undefined;
  return pickNumeric(spd?.productNo);
}

/**
 * channelProductNos ↔ originalProductNos 매핑으로 URL(채널) 상품번 → 원본상품번 변환.
 * 브랜드스토어는 simpleStandardGroupProduct 안에, 일반 스마트스토어는 simpleProductForDetailPage
 * 최상위에 두 배열이 들어온다 — 둘 다 찾기 위해 제한 깊이로 재귀 검색한다.
 */
export function mapChannelToOrigin(preload: unknown, channelProductNo: string): string | null {
  const root = (preload ?? {}) as Record<string, unknown>;
  const pools: unknown[] = [root.simpleProductForDetailPage, root.groupProduct];
  for (const pool of pools) {
    const found = findChannelOriginPair(pool, channelProductNo, 0);
    if (found) return found;
  }
  return null;
}

function findChannelOriginPair(node: unknown, channelProductNo: string, depth: number): string | null {
  if (node == null || typeof node !== "object" || depth > 6) return null;
  const rec = node as Record<string, unknown>;
  if (Array.isArray(rec.channelProductNos) && Array.isArray(rec.originalProductNos)) {
    const i = (rec.channelProductNos as unknown[]).findIndex((c) => String(c) === String(channelProductNo));
    if (i >= 0 && rec.originalProductNos[i] != null) return String(rec.originalProductNos[i]);
  }
  for (const v of Object.values(rec)) {
    if (v == null || typeof v !== "object") continue;
    const hit = findChannelOriginPair(v, channelProductNo, depth + 1);
    if (hit) return hit;
  }
  return null;
}

export type SmartstoreReviewRequest = {
  url: string;
  method: "POST" | "GET";
  body?: string;
  headers?: Record<string, string>;
};

export function buildQueryPagesRequest(
  merchantNo: string,
  originProductNo: string,
  page: number,
  pageSize: number,
  origin = ""
): SmartstoreReviewRequest {
  // 브랜드스토어는 /n/v1 + searchSortType, 일반 스마트스토어는 /i/v1 + reviewSearchSortType.
  // 잘못된 경로/필드는 404가 아니라 200 + HTML 을 반환하므로 (v1.0.1 핫픽스에서 확인) 분기가 필수다.
  const brand = isBrandHost(origin);
  const body = JSON.stringify({
    checkoutMerchantNo: Number(merchantNo),
    originProductNo: Number(originProductNo),
    page,
    pageSize,
    ...(brand ? { searchSortType: "REVIEW_RANKING" } : { reviewSearchSortType: "REVIEW_RANKING" })
  });
  const apiBase = brand ? "/n/v1" : "/i/v1";
  return { url: `${origin}${apiBase}/contents/reviews/query-pages`, method: "POST", body };
}

/** 묶음상품(group product) 판별: 페이지가 보낸 리뷰 요청 URL 에 group-products/ 경로가 있다. */
export function findGroupProductNo(resourceUrls: string[]): string | null {
  for (const u of resourceUrls) {
    const m = u.match(/\/contents\/reviews\/group-products\/(?:product-summary|gallery-attaches)\/(\d+)/);
    if (m) return m[1];
  }
  return null;
}

function reviewListApiBase(origin: string): string {
  return isBrandHost(origin) ? "/n/v1" : "/i/v1";
}

/** 묶음상품 전체 리뷰 목록 GET — 2026-08 라이브 확인:
 *  GET /n/v1/contents/reviews/group-products/product-summary/{groupProductNo}/reviews/GENERAL
 *      ?checkoutMerchantNo={merchant}&searchSortType=REVIEW_RANKING&page=&pageSize=
 *  (GENERAL=전체. STORE_PICK=엄선. 200 + JSON{contents[], totalElements, totalPages}) */
export function buildGroupProductReviewRequest(
  merchantNo: string,
  groupProductNo: string,
  page: number,
  pageSize: number,
  origin = ""
): SmartstoreReviewRequest {
  const q = new URLSearchParams({
    checkoutMerchantNo: merchantNo,
    searchSortType: "REVIEW_RANKING",
    page: String(page),
    pageSize: String(pageSize)
  });
  return {
    url: `${origin}${reviewListApiBase(origin)}/contents/reviews/group-products/product-summary/${groupProductNo}/reviews/GENERAL?${q.toString()}`,
    method: "GET"
  };
}

/** 일반(비-묶음) 상품 전체 리뷰 목록 GET — 위 GET 과 같은 계열(originProductNo 버전). */
export function buildProductSummaryReviewRequest(
  merchantNo: string,
  originProductNo: string,
  page: number,
  pageSize: number,
  origin = ""
): SmartstoreReviewRequest {
  const q = new URLSearchParams({
    checkoutMerchantNo: merchantNo,
    searchSortType: "REVIEW_RANKING",
    page: String(page),
    pageSize: String(pageSize)
  });
  return {
    url: `${origin}${reviewListApiBase(origin)}/contents/reviews/product-summary/${originProductNo}/reviews/GENERAL?${q.toString()}`,
    method: "GET"
  };
}

/** 요청의 page/pageSize 를 갱신해 다음 페이지 요청을 만든다 (GET은 쿼리, POST는 본문). */
export function withPage(req: SmartstoreReviewRequest, page: number, pageSize: number): SmartstoreReviewRequest {
  if (req.method === "GET") {
    const u = new URL(req.url);
    u.searchParams.set("page", String(page));
    u.searchParams.set("pageSize", String(pageSize));
    return { ...req, url: u.toString() };
  }
  let bodyObj: Record<string, unknown>;
  try {
    bodyObj = JSON.parse(req.body ?? "{}") as Record<string, unknown>;
  } catch {
    bodyObj = {};
  }
  bodyObj.page = page;
  bodyObj.pageSize = pageSize;
  return { ...req, body: JSON.stringify(bodyObj) };
}

/** fetch/XHR 로 replay 할 때 금지 헤더(fetch 가 throw 하는 것)를 걸러낸다. */
export function normalizeCapturedHeaders(headers: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof headers !== "object" || headers === null || Array.isArray(headers)) return out;
  const forbidden = new Set([
    "host",
    "origin",
    "referer",
    "referrer",
    "cookie",
    "connection",
    "content-length",
    "expect",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
    "via"
  ]);
  for (const [k, v] of Object.entries(headers as Record<string, unknown>)) {
    const name = k.trim().toLowerCase();
    if (!name || forbidden.has(name) || name.startsWith("sec-") || name.startsWith("proxy-")) continue;
    const val = Array.isArray(v) ? v.join(", ") : String(v);
    if (val) out[k.trim()] = val;
  }
  return out;
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

function pickNumeric(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) return String(v);
  if (typeof v === "string" && /^\d+$/.test(v.trim())) return v.trim();
  return null;
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
