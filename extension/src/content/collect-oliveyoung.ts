import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeOliveYoungReview } from "../lib/normalize";
import { OLIVEYOUNG_REVIEW_URL, oliveYoungReviewBody, parseOliveYoungPage, type OliveYoungCursor } from "../lib/oliveyoung";
import { CollectError, type RawReview } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

export async function collectOliveYoung(goodsNumber: string, opts: RunOptions): Promise<RawReview[]> {
  let cursor: OliveYoungCursor | undefined;
  const seenCursors = new Set<string>();
  const seenReviews = new Set<string>();
  const reviews = await paginate<RawReview>(async (page) => {
    let res: Response;
    try {
      res = await fetch(OLIVEYOUNG_REVIEW_URL, {
        method: "POST",
        credentials: "include",
        headers: { accept: "application/json", "content-type": "application/json" },
        body: JSON.stringify(oliveYoungReviewBody(goodsNumber, cursor))
      });
    } catch {
      throw new CollectError("NETWORK", "네트워크 오류로 올리브영 리뷰를 불러오지 못했습니다.");
    }
    if (res.status === 401) throw new CollectError("LOGIN", "올리브영에 로그인한 뒤 다시 시도해 주세요.");
    if (res.status === 403 || res.status === 429) {
      throw new CollectError("BLOCKED", "올리브영이 리뷰 요청을 제한했습니다. 잠시 후 다시 시도해 주세요.");
    }
    if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) {
      throw new CollectError("UNSUPPORTED", `올리브영 리뷰를 불러오지 못했습니다(status ${res.status}).`);
    }
    const parsed = parseOliveYoungPage(await res.json().catch(() => null));
    if (parsed.nextCursor) {
      const key = JSON.stringify(parsed.nextCursor);
      if (seenCursors.has(key)) throw new CollectError("UNSUPPORTED", "올리브영이 같은 리뷰 페이지를 반환했습니다. 잠시 후 다시 시도해 주세요.");
      seenCursors.add(key);
    }
    cursor = parsed.nextCursor;
    const unique = parsed.contents.filter((r) => {
      if (r.reviewId == null) return true;
      const key = String(r.reviewId);
      if (seenReviews.has(key)) return false;
      seenReviews.add(key);
      return true;
    });
    return { items: cleanReviews(unique.map(normalizeOliveYoungReview)), totalPages: cursor ? undefined : page };
  }, {
    maxItems: opts.maxItems,
    pageSize: 10,
    delayMs: randomDelay(COLLECT_PAGE_DELAY_MIN_MS, COLLECT_PAGE_DELAY_MAX_MS),
    sleep: realSleep,
    onProgress: opts.onProgress,
    shouldCancel: opts.shouldCancel
  });
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}
