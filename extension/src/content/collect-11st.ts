import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { elevenStreetReviewUrl, parseElevenStreetPage } from "../lib/11st";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalize11stReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 10; // 11번가 review-list 는 pageSize=10 고정 (실측)

export async function collect11st(itemId: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const raw = await paginate(
    async (page) => {
      const url = elevenStreetReviewUrl(itemId, page, PAGE_SIZE);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { accept: "text/html" }
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 리뷰를 불러오지 못했습니다.");
      }
      if (res.status === 403 || res.status === 429) {
        throw new CollectError("BLOCKED", "11번가가 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
      }
      if (res.status >= 400) {
        throw new CollectError("UNSUPPORTED", `11번가 리뷰를 불러오지 못했습니다(status ${res.status}).`);
      }
      const html = await res.text().catch(() => "");
      const doc = new DOMParser().parseFromString(html, "text/html");
      const items = parseElevenStreetPage(doc);
      // 리뷰 없음(마지막 페이지) 이면 빈 배열 — paginate 가 종료.
      return { items };
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

  const reviews = cleanReviews(raw.map((r) => normalize11stReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}