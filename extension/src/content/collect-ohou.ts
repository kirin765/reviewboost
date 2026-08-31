import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { ohouReviewUrl, parseOhouPage } from "../lib/ohou";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeOhouReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 5; // store.ohou.se api/goods/reviews 는 per=5 가 페이지 기본값 (실측)

export async function collectOhou(productionId: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const raw = await paginate(
    async (page) => {
      const url = ohouReviewUrl(productionId, page, PAGE_SIZE);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          credentials: "include",
          headers: { accept: "application/json" }
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 리뷰를 불러오지 못했습니다.");
      }
      if (res.status === 403 || res.status === 429) {
        throw new CollectError("BLOCKED", "오늘의집이 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
      }
      if (res.status >= 400 || !(res.headers.get("content-type") || "").includes("json")) {
        throw new CollectError("UNSUPPORTED", `오늘의집 리뷰를 불러오지 못했습니다(status ${res.status}).`);
      }
      const json = await res.json().catch(() => null);
      const { contents, totalCount } = parseOhouPage(json);
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

  const reviews = cleanReviews(raw.map((r) => normalizeOhouReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}