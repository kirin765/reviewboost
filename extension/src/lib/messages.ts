import type { CollectErrorCode, Platform, RawReview } from "./types";

export type PageContext = {
  platform: Platform | null;
  productId: string | null;
  title: string;
};

/** popup → content script */
export type ContentRequest =
  | { type: "PING" }
  | { type: "COLLECT_START"; maxItems: number }
  | { type: "COLLECT_CANCEL" };

/** content script → popup (PING은 sendResponse, 나머지는 runtime broadcast) */
export type PongResponse = { type: "PONG"; ctx: PageContext };

export type StreamMessage =
  | { type: "PROGRESS"; collected: number; total: number | null }
  | { type: "DONE"; reviews: RawReview[] }
  | { type: "ERROR"; code: CollectErrorCode; message: string };

/** ReviewBoost 페이지 → background (externally_connectable) */
export type ExternalRequest =
  | { type: "PULL_REPORT" }
  | { type: "AUTH_TOKEN"; token: string; expiresAt: number };
export type ExternalResponse = { ok: true; payload?: unknown } | { ok: false };
