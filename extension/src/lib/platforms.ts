/**
 * 확장이 지원하는 플랫폼 레지스트리 — 호스트 매칭 + 상품 ID 추출 (순수 함수).
 *
 * 대상 선정 근거: reports/platform-review-download-map-2026-08-30.md —
 * "판매자에게 리뷰 다운로드를 제공하지 않는(또는 미확인) 플랫폼" 필터.
 * 제공 플랫폼(스마트스토어·카페24 자사몰)은 확장의 순수 가치가 없으므로 제외 대상
 * (단, 기존 지원인 스마트스토어는 유지 — 이미 라이브 사용자 보호).
 *
 * URL 형태는 2026-08-30 실측/추정: [실측] = 직접 확인, [추정] = URL 규약 기반.
 */

export type PlatformKey =
  | "coupang"
  | "smartstore"
  | "musinsa"
  | "29cm"
  | "gmarket"
  | "auction"
  | "11st"
  | "ssg"
  | "ohou"
  | "curly";

export type PlatformMeta = {
  key: PlatformKey;
  label: string;
  /** 호스트 매칭 — content script 접근 여부와 별개로 입력 URL 판별용. */
  hostRe: RegExp;
  /** 상품 페이지 경로/쿼리에서 상품 ID 추출. 비-상품이면 null. */
  extract: (href: string) => string | null;
};

/** 호스트만 떼어낸다 (스킴/경로/쿼리 제거). */
function bareHost(h: string): string {
  try {
    return new URL(h).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export const PLATFORMS: PlatformMeta[] = [
  {
    key: "musinsa",
    label: "무신사",
    hostRe: /(^|\.)musinsa\.com$/i,
    // [실측 2026-08-31] 상품 URL 은 /goods/{no} 가 아니라 /products/{no} (구 /goods/ 404 확인)
    extract: (href) => href.match(/\/products\/(\d+)/)?.[1] ?? null
  },
  {
    key: "29cm",
    label: "29CM",
    hostRe: /(^|\.)29cm\.co\.kr$/i,
    extract: (href) => href.match(/\/products\/(\d+)/)?.[1] ?? null // [실측]
  },
  {
    key: "gmarket",
    label: "G마켓",
    hostRe: /(^|\.)gmarket\.co\.kr$/i,
    // [실측 2026-08-31] 파라미터는 goodsCode (대문자 C) — 대소문자 무시 매칭
    extract: (href) => href.match(/goodscode=(\d+)/i)?.[1] ?? null
  },
  {
    key: "auction",
    label: "옥션",
    hostRe: /(^|\.)auction\.co\.kr$/i,
    // [실측 2026-08-31] itemno 는 문자접두+숫자 (F361333759 / C337580252 / B883030836) — 전체를 상품 ID 로 사용
    extract: (href) => href.match(/itemno=([A-Za-z]?\d+)/i)?.[1] ?? null
  },
  {
    key: "11st",
    label: "11번가",
    hostRe: /(^|\.)11st\.co\.kr$/i,
    extract: (href) => href.match(/\/products\/(\d+)/)?.[1] ?? null // [실측]
  },
  {
    key: "ssg",
    label: "SSG닷컴",
    hostRe: /(^|\.)ssg\.com$/i,
    // itemId (siteNo 는 컬렉터가 location.href 에서 직접 추출)
    extract: (href) => href.match(/[?&]itemId=(\d+)/i)?.[1] ?? null // [실측]
  },
  {
    key: "ohou",
    label: "오늘의집",
    hostRe: /(^|\.)ohou\.se$/i,
    extract: (href) => href.match(/\/goods\/(\d+)/)?.[1] ?? null // [실측] store.ohou.se/goods/{id}
  },
  {
    key: "curly",
    label: "컬리",
    hostRe: /(^|\.)kurly\.com$/i,
    extract: (href) => {
      const m = href.match(/\/goods\/(\d+)/); // [실측 2026-08-31] www.kurly.com/goods/{id}
      if (m) return m[1];
      return href.match(/goodsno=(\d+)/i)?.[1] ?? null; // [실측] 구형 쿼리형
    }
  }
];

/** 호스트명으로 플랫폼 메타 조회. 등록 안 된 호스트면 null. */
export function platformForHost(hostname: string): PlatformMeta | null {
  const h = bareHost(hostname);
  if (!h) return null;
  return PLATFORMS.find((p) => p.hostRe.test(h)) ?? null;
}

/** URL → 플랫폼 메타 + 상품 ID. 비-상품이면 null. */
export function detectPlatform(href: string): { platform: PlatformMeta; productId: string } | null {
  const meta = platformForHost(new URL(href).hostname);
  if (!meta) return null;
  const productId = meta.extract(href);
  return productId ? { platform: meta, productId } : null;
}