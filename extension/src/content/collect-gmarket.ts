import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import {
  GMARKET_REVIEW_ENDPOINT,
  GMARKET_REVIEW_SHELL_ENDPOINT,
  gmarketReviewBody,
  parseGmarketPage,
  parseGmarketTotalPages
} from "../lib/gmarket";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeGmarketReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 10; // Review/Text 는 페이지당 10행 (실측)

export async function collectGmarket(goodsCode: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  // 사이트 변경(실측 2026-08-31 후속): 1페이지는 POST /Review(셸 — data-total-page 동봉),
  // 2페이지+는 POST /Review/Text 에 totalPage 필수 (누락 시 서버가 연결 reset).
  let totalPages: number | null = null;
  const raw = await paginate(
    async (page) => {
      const shell = page === 1;
      let res: Response;
      try {
        res = await fetch(shell ? GMARKET_REVIEW_SHELL_ENDPOINT : GMARKET_REVIEW_ENDPOINT, {
          method: "POST",
          credentials: "include",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: shell ? gmarketReviewBody(goodsCode, 1) : gmarketReviewBody(goodsCode, page, totalPages ?? undefined)
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
      if (shell) totalPages = parseGmarketTotalPages(html);
      return { items: parseGmarketPage(doc), totalPages: shell ? (totalPages ?? undefined) : undefined };
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