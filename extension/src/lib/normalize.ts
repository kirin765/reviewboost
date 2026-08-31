import type { RawReview, ReviewRow } from "./types";
import { twentyNineImageUrl } from "./29cm";
import { musinsaImageUrl } from "./musinsa";
import { ohouImageUrl } from "./ohou";

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

const COUPANG_STATIC_BASE = "https://static.coupangcdn.com";
const COUPANG_THUMB_BASE = "https://thumbnail.coupangcdn.com/thumbnails/local/q-1";

/**
 * 리뷰 첨부 이미지 URL 추출 (방어적, 실 API 형태 기준).
 * - 쿠팡 실 API(2026-08 확인): attachments[{ attachmentType:"IMAGE", imgSrcOrigin,
 *   imgSrcThumbnail, uploadedFilePath }] — imgSrcOrigin 이 원본 전체 URL 이다.
 *   (구형 attachedImages[{ cdnPath }] 도 호환: cdnPath 는 static.coupangcdn.com 을 붙인다)
 * - 스마트스토어 실 API(2026-08 확인): reviewAttaches[{ reviewAttachmentType:"I",
 *   attachUrl, attachPath }] — attachUrl 이 전체 URL. 대표 이미지 repThumbnailAttach /
 *   갤러리 representAttach 도 같은 형태다.
 * - VIDEO 등 이미지가 아닌 첨부는 제외하고, 중복·비-http(s)·빈 값도 걸러낸다.
 */
function pickImageUrls(raw: AnyRec): string[] {
  const candidates = [
    raw.attachedImages,
    raw.attachImages,
    raw.attachments,
    raw.images,
    raw.imageUrls,
    raw.imageList,
    raw.reviewAttaches,
    raw.repThumbnailAttach,
    raw.representAttach
  ];
  const urls: string[] = [];
  const push = (v: unknown): void => {
    if (typeof v !== "string") return;
    const s = v.trim();
    if (!s) return;
    let url = s;
    if (url.startsWith("//")) url = `https:${url}`;
    else if (url.startsWith("/")) url = `${COUPANG_STATIC_BASE}${url}`;
    else if (/^image\d?\//.test(url)) url = `${COUPANG_THUMB_BASE}/${url}`;
    try {
      const parsed = new URL(url);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") urls.push(parsed.toString());
    } catch {
      /* 비-URL 문자열 무시 */
    }
  };
  const pushItem = (item: unknown): void => {
    if (typeof item === "string") {
      push(item);
      return;
    }
    if (!item || typeof item !== "object") return;
    const rec = item as Record<string, unknown>;
    if (rec.attachmentType != null && rec.attachmentType !== "IMAGE") return; // 쿠팡 VIDEO
    if (rec.reviewAttachmentType != null && rec.reviewAttachmentType !== "I") return; // 스마트스토어("I"=이미지)
    if (rec.attachType != null && rec.attachType !== "I") return; // 갤러리 attachType
    push(
      rec.imgSrcOrigin ??
        rec.imgSrcThumbnail ??
        rec.attachUrl ??
        rec.attachPath ??
        rec.imageUrl ??
        rec.url ??
        rec.src ??
        rec.cdnPath ??
        rec.imagePath ??
        rec.uploadedFilePath
    );
  };
  for (const c of candidates) {
    if (Array.isArray(c)) {
      for (const item of c) pushItem(item);
    } else if (typeof c === "string") {
      push(c);
    } else if (c && typeof c === "object") {
      pushItem(c);
    }
  }
  return [...new Set(urls)];
}

type AnyRec = Record<string, unknown> & { member?: { name?: unknown } };

/** 쿠팡 리뷰 raw → RawReview (crawler.js normalizeReview 포팅). */
export function normalizeCoupangReview(raw: AnyRec): RawReview {
  const imageUrls = pickImageUrls(raw);
  return {
    text: pickString(raw.content, raw.reviewContent),
    rating: clampRating(raw.rating),
    reviewedAt: toIsoDate(raw.reviewAt ?? raw.createdAt ?? null),
    title: pickString(raw.title, raw.reviewTitle) || undefined,
    author: pickString(raw.displayName, raw.nickname, raw.member?.name) || undefined,
    helpfulCount: pickHelpful(raw.helpfulCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** 스마트스토어 리뷰 raw → RawReview (필드명 방어적). */
export function normalizeSmartstoreReview(raw: AnyRec): RawReview {
  const imageUrls = pickImageUrls(raw);
  return {
    text: pickString(raw.reviewContent, raw.content, raw.text, raw.body),
    rating: clampRating(raw.reviewScore ?? raw.score ?? raw.rating ?? raw.star),
    reviewedAt: toIsoDate(raw.createDate ?? raw.createdDate ?? raw.writeDate ?? raw.reviewDate ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.maskedWriterId, raw.writerMemberId, raw.memberId, raw.nickname) || undefined,
    helpfulCount: pickHelpful(raw.helpCount ?? raw.helpfulCount ?? raw.likeCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** 29CM 리뷰 raw → RawReview (라이브 캡처 스키마 2026-08-30 — contents/point/insertTimestamp/userId). */
export function normalize29cmReview(raw: AnyRec): RawReview {
  const uploads = Array.isArray(raw.uploadFiles) ? raw.uploadFiles : [];
  const imageUrls = uploads
    .map((u) => twentyNineImageUrl((u as Record<string, unknown>)?.url))
    .filter(Boolean)
    .map((u) => u as string);
  return {
    text: pickString(raw.contents, raw.content, raw.reviewContent, raw.text),
    rating: clampRating(raw.point ?? raw.rating ?? raw.reviewScore ?? raw.star),
    reviewedAt: toIsoDate(raw.insertTimestamp ?? raw.createDate ?? raw.reviewDate ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.userId, raw.writerId, raw.nickname) || undefined,
    helpfulCount: pickHelpful(raw.helpfulCount ?? raw.likeCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** 빈 본문 제거 + 한도 적용. */
export function cleanReviews(reviews: RawReview[]): RawReview[] {
  return reviews.filter((r) => r.text.trim().length > 0);
}

/** 11번가 리뷰 raw → RawReview (lib/11st.ts DOM 파싱 산출물 — 2026-08-31 실측 스키마). */
export function normalize11stReview(raw: AnyRec): RawReview {
  const imageUrls = (Array.isArray(raw.images) ? raw.images : []).filter((u): u is string => typeof u === "string");
  return {
    text: pickString(raw.text, raw.content),
    rating: clampRating(raw.rating),
    reviewedAt: toIsoDate(raw.reviewedAt ?? raw.date ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.author) || undefined,
    helpfulCount: pickHelpful(raw.helpfulCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** SSG닷컴 리뷰 raw → RawReview (lib/ssg.ts DOM 파싱 산출물). */
export function normalizeSsgReview(raw: AnyRec): RawReview {
  const imageUrls = (Array.isArray(raw.images) ? raw.images : []).filter((u): u is string => typeof u === "string");
  return {
    text: pickString(raw.text, raw.content),
    rating: clampRating(raw.rating),
    reviewedAt: toIsoDate(raw.reviewedAt ?? raw.date ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.author) || undefined,
    helpfulCount: pickHelpful(raw.helpfulCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** 무신사 리뷰 raw → RawReview (goods.musinsa.com view/list 스키마 — grade 문자열, createDate ISO+09:00). */
export function normalizeMusinsaReview(raw: AnyRec): RawReview {
  const images = Array.isArray(raw.images) ? raw.images : [];
  const imageUrls = images
    .map((img) => musinsaImageUrl((img as Record<string, unknown>)?.imageUrl))
    .filter(Boolean)
    .map((u) => u as string);
  return {
    text: pickString(raw.content, raw.text),
    rating: clampRating(raw.grade ?? raw.rating),
    reviewedAt: toIsoDate(raw.createDate ?? raw.reviewedAt ?? null),
    title: pickString(raw.title) || undefined,
    // userId/encryptedUserId 는 해시 — 사용자식별로는 쓸 수 없어 author 미기재(프라이버시 유리)
    helpfulCount: pickHelpful(raw.likeCount ?? raw.helpfulCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** 오늘의집 리뷰 raw → RawReview (store.ohou.se api/goods/reviews 스키마 — review.comment/starAvg). */
export function normalizeOhouReview(raw: AnyRec): RawReview {
  const review = (raw.review ?? {}) as Record<string, unknown>;
  const card = (raw.card ?? {}) as Record<string, unknown>;
  const imageUrls = [card.imageUrl, card.imgUrl, card.imgUrlPc]
    .map((u) => ohouImageUrl(u))
    .filter(Boolean)
    .map((u) => u as string);
  return {
    text: pickString(review.comment, raw.contents, raw.reviewText),
    rating: clampRating(review.starAvg ?? raw.starAvg),
    reviewedAt: toIsoDate(raw.createdAt ?? review.createdAt ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.writerNickname) || undefined,
    helpfulCount: pickHelpful(raw.praiseCount ?? raw.likeCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** G마켓 상품평 raw → RawReview (lib/gmarket.ts DOM 파싱 산출물 — 별점 없음, 이미지 없음). */
export function normalizeGmarketReview(raw: AnyRec): RawReview {
  return {
    text: pickString(raw.text, raw.content),
    rating: clampRating(raw.rating), // 프래그먼트에 리뷰별 별점 없음 → null (실측)
    reviewedAt: toIsoDate(raw.reviewedAt ?? raw.date ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.author) || undefined,
    helpfulCount: 0
  };
}

/** 컬리 후기 raw → RawReview (product-review/v4 스키마 — contents/registeredAt, 별점 없음). */
export function normalizeCurlyReview(raw: AnyRec): RawReview {
  const images = Array.isArray(raw.images) ? raw.images : [];
  const imageUrls = images
    .map((img) => (img as Record<string, unknown>)?.image)
    .filter((u): u is string => typeof u === "string" && u.trim().length > 0);
  return {
    text: pickString(raw.contents, raw.content, raw.text),
    rating: clampRating(raw.rating ?? raw.starAvg), // 실측: 컬리 후기에 별점 필드 없음 → null
    reviewedAt: toIsoDate(raw.registeredAt ?? raw.createdAt ?? null),
    title: pickString(raw.title) || undefined,
    author: pickString(raw.ownerName, raw.writerName) || undefined,
    helpfulCount: pickHelpful(raw.likeCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** 옥션 리뷰 raw → RawReview (lib/auction.ts DOM 파싱 산출물 — 2026-08-31 실측 스키마). */
export function normalizeAuctionReview(raw: AnyRec): RawReview {
  const imageUrls = (Array.isArray(raw.images) ? raw.images : []).filter((u): u is string => typeof u === "string");
  return {
    text: pickString(raw.text, raw.content),
    rating: clampRating(raw.rating),
    reviewedAt: toIsoDate(raw.reviewedAt ?? raw.date ?? null),
    // 옥션 리뷰 프래그먼트에 리뷰 제목은 없음 (실측: text__option / box__review-text 만 존재)
    author: pickString(raw.author) || undefined,
    helpfulCount: pickHelpful(raw.helpfulCount),
    ...(imageUrls.length ? { imageUrls } : {})
  };
}

/** 깔때기 전송용 — ReviewRow 필드만 남긴다. */
export function toReviewRows(reviews: RawReview[]): ReviewRow[] {
  return reviews.map((r) => ({ text: r.text, rating: r.rating, reviewedAt: r.reviewedAt ?? null }));
}
