import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { coupangReviewApiUrl, parseCoupangPage } from "../lib/coupang";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { normalizeCoupangReview } from "../lib/normalize";
import { CollectError, type CollectionSummary, type RawReview } from "../lib/types";

const PAGE_SIZE = 10; // 쿠팡 기본값(50은 차단). crawler-server 와 동일.

export type RunOptions = {
  maxItems: number;
  onSummary?: (summary: CollectionSummary) => void;
  onProgress?: (collected: number, total: number | null) => void;
  shouldCancel?: () => boolean;
};

export async function collectCoupang(productId: string, opts: RunOptions): Promise<RawReview[]> {
  let reportedTotal: number | null = null;
  const raw: Record<string, unknown>[] = [];
  const seen = new Set<string>();
  let allIdentified = true;
  const target = () => Math.min(opts.maxItems, reportedTotal ?? opts.maxItems);
  const scan = async (sortBy: "ORDER_SCORE_ASC" | "DATE_DESC", rating?: number) => paginate(
    async (page) => {
      let res: Response;
      try {
        // content script(페이지 origin) 에서 same-origin + 실제 쿠키로 호출 → Akamai 통과.
        res = await fetch(coupangReviewApiUrl(productId, page, PAGE_SIZE, sortBy, rating), {
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
      if (!res.ok || !Array.isArray(json?.rData?.paging?.contents)) {
        throw new CollectError("UNSUPPORTED", "쿠팡 리뷰 응답을 읽지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      const { contents, totalPage } = parseCoupangPage(json);
      const total = Number(json.rData.paging.totalCount);
      if (Number.isFinite(total) && total > 0) reportedTotal = Math.max(reportedTotal ?? 0, total);
      for (const entry of contents) {
        if (raw.length >= target()) break;
        if (!entry || typeof entry !== "object") throw new CollectError("UNSUPPORTED", "쿠팡 리뷰 형식이 변경되었습니다.");
        const review = entry as Record<string, unknown>;
        const id = review.reviewId;
        if (typeof id === "number" || (typeof id === "string" && id.length > 0)) {
          const key = String(id);
          if (seen.has(key)) continue;
          seen.add(key);
        } else {
          // Do not merge alternate views without stable IDs.
          allIdentified = false;
        }
        raw.push(review);
      }
      opts.onProgress?.(raw.length, reportedTotal);
      return { items: contents, totalPages: totalPage, total: reportedTotal ?? undefined };
    },
    {
      maxItems: opts.maxItems,
      pageSize: PAGE_SIZE,
      delayMs: randomDelay(COLLECT_PAGE_DELAY_MIN_MS, COLLECT_PAGE_DELAY_MAX_MS),
      sleep: realSleep,
      shouldCancel: () => !!opts.shouldCancel?.() || raw.length >= target()
    }
  );

  await scan("ORDER_SCORE_ASC");
  // Coupang may end an overall sort at 1,500 rows. Its normal latest/rating
  // views expose other IDs; merge those only while the requested target is unmet.
  // 보조 스캔이 차단/형식 오류로 실패해도 이미 모은 리뷰는 버리지 않는다 — partial 안내와 함께 반환.
  try {
    for (const rating of [undefined, 1, 2, 3, 4, 5]) {
      if (opts.shouldCancel?.() || !allIdentified || raw.length === 0 || raw.length >= target()) break;
      await realSleep(randomDelay(COLLECT_PAGE_DELAY_MIN_MS, COLLECT_PAGE_DELAY_MAX_MS)());
      await scan("DATE_DESC", rating);
    }
  } catch {
    /* keep what the primary scan collected */
  }

  // Export ratings and title-only feedback too; text analysis filters separately.
  const reviews = raw.map((r) => normalizeCoupangReview(r as Record<string, unknown>));
  opts.onSummary?.({
    reportedTotal,
    requested: opts.maxItems,
    collected: reviews.length,
    textReviews: reviews.filter(r => r.text.trim().length > 0).length,
    partial: reviews.length < Math.min(opts.maxItems, reportedTotal ?? opts.maxItems)
  });
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}
