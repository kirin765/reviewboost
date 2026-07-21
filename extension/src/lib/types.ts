export type Platform = "coupang" | "smartstore";

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
