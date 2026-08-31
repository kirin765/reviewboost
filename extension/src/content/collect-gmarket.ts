import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { GMARKET_REVIEW_ENDPOINT, gmarketReviewBody, parseGmarketPage } from "../lib/gmarket";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeGmarketReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 10; // Review/Text 는 페이지당 10행 (실측)

export async function collectGmarket(goodsCode: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const raw = await paginate(
    async (page) => {
      let res: Response;
      try {
        res = await fetch(GMARKET_REVIEW_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: gmarketReviewBody(goodsCode, page)
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 상품평을 불러오지 못했습니다.");
      }
      if (res.status === 403 || res.status === 429) {
        throw new CollectError("BLOCKED", "G마켓이 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
      }
      if (res.status >= 400) {
        throw new CollectError("UNSUPPORTED", `G마켓 상품평을 불러오지 못했습니다(status ${res.status}).`);
      }
      const html = await res.text().catch(() => "");
      const doc = new DOMParser().parseFromString(html, "text/html");
      return { items: parseGmarketPage(doc) };
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

  const reviews = cleanReviews(raw.map((r) => normalizeGmarketReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 상품평이 없습니다.");
  return reviews;
}