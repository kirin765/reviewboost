import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { musinsaReviewUrl, parseMusinsaPage } from "../lib/musinsa";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeMusinsaReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 10; // musinsa view/list pageSize=10 (실측)

export async function collectMusinsa(goodsNo: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const raw = await paginate(
    async (page) => {
      // 무신사 리뷰 API는 0-based 페이지다 (29CM 과 동일).
      const url = musinsaReviewUrl(goodsNo, page - 1, PAGE_SIZE);
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
        throw new CollectError("BLOCKED", "무신사가 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
      }
      if (res.status >= 400 || !(res.headers.get("content-type") || "").includes("json")) {
        throw new CollectError("UNSUPPORTED", `무신사 리뷰를 불러오지 못했습니다(status ${res.status}).`);
      }
      const json = await res.json().catch(() => null);
      const { contents, totalCount } = parseMusinsaPage(json);
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

  const reviews = cleanReviews(raw.map((r) => normalizeMusinsaReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}