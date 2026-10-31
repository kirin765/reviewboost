/**
 * 클릭 측정용 아웃바운드 리디렉션 목록.
 *
 * 게시물·블로그에서 외부 목적지(앱스토어 등)로 바로 링크하지 않고
 * `/go/<slug>` 를 거치게 해서 클릭을 `funnel_events` 에 남긴다.
 *
 * - 여기 없는 slug 는 404 — 열린 리디렉션(open redirect)을 만들지 않는다.
 * - 새 캠페인은 이 배열에 항목을 추가하고 배포하면 된다.
 */
export type GoLink = {
  /** URL 경로 조각. 소문자·숫자·하이픈만. */
  slug: string;
  /** 이동 목적지(절대 URL, https). */
  destination: string;
  /** 사람이 읽는 이름(보고서·로그용). */
  label: string;
  /** 같은 목적지를 쓰는 링크를 묶는 캠페인 이름. */
  campaign: string;
  /** 등록일 (YYYY-MM-DD). */
  createdAt: string;
};

export const GO_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

export const goLinks: GoLink[] = [
  {
    slug: "reviewisa-cafe24-story-20261031",
    destination: "https://store.cafe24.com/kr/apps/43542",
    label: "리뷰이사 카페24 앱스토어 (스토리 2026-10-31)",
    campaign: "reviewisa-cafe24",
    createdAt: "2026-10-31"
  },
  {
    slug: "reviewisa-cafe24-blog",
    destination: "https://store.cafe24.com/kr/apps/43542",
    label: "리뷰이사 카페24 앱스토어 (사이트 블로그 CTA)",
    campaign: "reviewisa-cafe24",
    createdAt: "2026-10-31"
  }
];

const bySlug = new Map(goLinks.map((link) => [link.slug, link]));

export function resolveGoLink(slug: string): GoLink | null {
  const normalized = slug.trim().toLowerCase();
  if (!GO_SLUG_PATTERN.test(normalized)) return null;
  return bySlug.get(normalized) ?? null;
}

export function goPath(slug: string): string {
  return `/go/${slug}`;
}
