import type { RawReview, ReviewRow } from "./types";

/** ReviewBoost csv.ts(78-87) 와 동일한 별점 정규화: 0-5 그대로, 6-10 은 반감. */
export function clampRating(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 5) return n;
  if (n > 5 && n <= 10) return Math.round((n / 2) * 10) / 10;
  return null;
}

/** epoch ms / 날짜 문자열(YYYY-MM-DD, YYYY.MM.DD ...) → ISO. 실패 시 null. */
export function toIsoDate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) {
    const d = new Date(v);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  const s = String(v).trim();
  if (!s) return null;
  if (/^\d{12,}$/.test(s)) {
    const d = new Date(Number(s));
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  // ISO 날짜시간(밀리초의 '.' 포함)은 그대로 파싱 — 구분자 치환으로 훼손 금지.
  if (s.includes("T")) {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d.toISOString() : null;
  }
  // 점/슬래시 구분 날짜(YYYY.MM.DD, YYYY/MM/DD) → 대시(UTC)로 정규화.
  const normalized = s.replace(/[./]/g, "-").replace(/-+$/, "");
  const d = new Date(normalized);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

function pickString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function pickHelpful(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

type AnyRec = Record<string, unknown> & { member?: { name?: unknown } };

/** 쿠팡 리뷰 raw → RawReview (crawler.js normalizeReview 포팅). */
export function normalizeCoupangReview(raw: AnyRec): RawReview {
  return {
    text: pickString(raw.content, raw.reviewContent),
    rating: clampRating(raw.rating),
    reviewedAt: toIsoDate(raw.reviewAt ?? raw.createdAt ?? null),
    title: pickString(raw.title, raw.reviewTitle) || undefined,
    author: pickString(raw.displayName, raw.nickname, raw.member?.name) || undefined,
    helpfulCount: pickHelpful(raw.helpfulCount)
  };
}

/** 스마트스토어 리뷰 raw → RawReview (필드명 방어적). */
export function normalizeSmartstoreReview(raw: AnyRec): RawReview {
  return {
    text: pickString(raw.reviewContent, raw.content, raw.text, raw.body),
    rating: clampRating(raw.reviewScore ?? raw.score ?? raw.rating ?? raw.star),
    reviewedAt: toIsoDate(raw.createDate ?? raw.createdDate ?? raw.writeDate ?? raw.reviewDate ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.maskedWriterId, raw.writerMemberId, raw.memberId, raw.nickname) || undefined,
    helpfulCount: pickHelpful(raw.helpCount ?? raw.helpfulCount ?? raw.likeCount)
  };
}

/** 빈 본문 제거 + 한도 적용. */
export function cleanReviews(reviews: RawReview[]): RawReview[] {
  return reviews.filter((r) => r.text.trim().length > 0);
}

/** 깔때기 전송용 — ReviewRow 필드만 남긴다. */
export function toReviewRows(reviews: RawReview[]): ReviewRow[] {
  return reviews.map((r) => ({ text: r.text, rating: r.rating, reviewedAt: r.reviewedAt ?? null }));
}
