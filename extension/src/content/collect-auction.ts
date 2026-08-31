import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import {
  AUCTION_REVIEW_ENDPOINT,
  auctionReviewBody,
  parseAuctionPage,
  parseAuctionPayload
} from "../lib/auction";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeAuctionReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 10; // GetReviewList 는 페이지당 19건(실측) — 한도는 maxItems 로 제어

export async function collectAuction(itemNo: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const raw = await paginate(
    async (page) => {
      let res: Response;
      try {
        res = await fetch(AUCTION_REVIEW_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/json;charset=utf-8" },
          body: auctionReviewBody(itemNo, page)
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 리뷰를 불러오지 못했습니다.");
      }
      if (res.status === 403 || res.status === 429) {
        throw new CollectError("BLOCKED", "옥션이 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
      }
      if (res.status >= 400) {
        throw new CollectError("UNSUPPORTED", `옥션 리뷰를 불러오지 못했습니다(status ${res.status}).`);
      }
      const text = await res.text().catch(() => "");
      let json: unknown = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new CollectError("UNSUPPORTED", "옥션 리뷰 응답을 해석하지 못했습니다.");
      }
      const doc = parseAuctionPayload(json);
      if (!doc) throw new CollectError("UNSUPPORTED", "옥션 리뷰 응답이 비어 있습니다.");
      return { items: parseAuctionPage(doc) };
    },
    {
      maxItems: opts.maxItems,
      pageSize: PAGE_SIZE,
      delayMs: randomDelay(COLLECT_PAGE_DELAY_MIN_MS, COLLECT_PAGE_DELAY_MAX_MS),
      sleep: realSleep,
      onProgress: opts.onProgress,
      shouldCancel: opts.shouldCancel
    }
  );

  const reviews = cleanReviews(raw.map((r) => normalizeAuctionReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}