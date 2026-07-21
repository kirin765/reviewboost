import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { coupangReviewApiUrl, parseCoupangPage } from "../lib/coupang";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeCoupangReview } from "../lib/normalize";
import { CollectError, type RawReview } from "../lib/types";

const PAGE_SIZE = 10; // 쿠팡 기본값(50은 차단). crawler-server 와 동일.

export type RunOptions = {
  maxItems: number;
  onProgress?: (collected: number, total: number | null) => void;
  shouldCancel?: () => boolean;
};

export async function collectCoupang(productId: string, opts: RunOptions): Promise<RawReview[]> {
  const raw = await paginate(
    async (page) => {
      let res: Response;
      try {
        // content script(페이지 origin) 에서 same-origin + 실제 쿠키로 호출 → Akamai 통과.
        res = await fetch(coupangReviewApiUrl(productId, page, PAGE_SIZE), {
          headers: { accept: "application/json" },
          credentials: "include"
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 리뷰를 불러오지 못했습니다.");
      }
      const ct = res.headers.get("content-type") || "";
      if (res.status === 403 || !ct.includes("json")) {
        throw new CollectError(
          "BLOCKED",
          "쿠팡이 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요."
        );
      }
      const json = await res.json().catch(() => null);
      const { contents, totalPage } = parseCoupangPage(json);
      return { items: contents, totalPages: totalPage };
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

  const reviews = cleanReviews(raw.map((r) => normalizeCoupangReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}
