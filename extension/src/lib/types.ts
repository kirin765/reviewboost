import type { PlatformKey } from "./platforms";

export type Platform = "coupang" | "smartstore" | PlatformKey;

/** Matches ReviewBoost's ReviewRow (src/lib/types.ts) for the analysis funnel. */
export type ReviewRow = {
  text: string;
  rating: number | null;
  reviewedAt?: string | null;
};

/** Funnel sends only ReviewRow fields; the xlsx export keeps the extra columns. */
export type RawReview = ReviewRow & {
  title?: string;
  author?: string;
  helpfulCount?: number;
  /** 리뷰에 첨부된 이미지 URL (쿠팡 attachedImages / 스마트스토어 attachImages). */
  imageUrls?: string[];
};

export type CollectErrorCode =
  | "NOT_PRODUCT"
  | "BLOCKED"
  | "LOGIN"
  | "EMPTY"
  | "NETWORK"
  | "UNSUPPORTED"
  | "UNKNOWN";

export class CollectError extends Error {
  code: CollectErrorCode;
  constructor(code: CollectErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "CollectError";
  }
}
