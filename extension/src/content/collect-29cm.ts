import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { parseTwentyNinePage, twentyNineReviewApiUrl } from "../lib/29cm";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalize29cmReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 20;

export async function collect29cm(itemId: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const raw = await paginate(
    async (page) => {
      // 29CM 리뷰 API는 0-based 페이지다.
      const url = twentyNineReviewApiUrl(itemId, page - 1, PAGE_SIZE);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json", "accept-charset": "utf-8" }
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 리뷰를 불러오지 못했습니다.");
      }
      const ct = res.headers.get("content-type") || "";
      if (res.status === 403 || res.status === 429) {
        throw new CollectError("BLOCKED", "29CM이 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
      }
      if (res.status >= 400 || !ct.includes("json")) {
        throw new CollectError(
          "UNSUPPORTED",
          res.status === 401 || res.status === 403
            ? "29CM 로그인이 필요합니다."
            : `29CM 리뷰를 불러오지 못했습니다(status ${res.status}).`
        );
      }
      const json = await res.json().catch(() => null);
      const { contents, totalCount } = parseTwentyNinePage(json);
      return {
        items: contents,
        total: totalCount,
        totalPages: totalCount > 0 ? Math.ceil(totalCount / PAGE_SIZE) : 1
      };
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

  const reviews = cleanReviews(raw.map((r) => normalize29cmReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}