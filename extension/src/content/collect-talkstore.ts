import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { normalizeTalkstoreReview } from "../lib/normalize";
import { parseTalkstorePage, talkstoreReviewApiUrl } from "../lib/talkstore";
import { CollectError, type RawReview } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

// 실측: size 는 100까지 허용된다. 50이면 7,943개 상품도 159회 요청으로 끝난다.
const PAGE_SIZE = 50;

/**
 * 톡스토어 리뷰 수집. 페이지 origin(same-origin) + 사용자 쿠키로 내부 JSON API 를 호출한다.
 * - 공개 정렬 기본값(추천순 RECOMMENDATION_SCORE)으로 0-based 페이지를 끝까지 순회.
 * - 리뷰 id 로 중복 제거(정렬 변동·페이지 겹침 방어), 같은 페이지만 반복되면 2회 후 종료.
 * - 별점만 있는 리뷰도 내보내기에 포함하고, 텍스트 분석 수는 summary 로 따로 보고한다.
 */
export async function collectTalkstore(store: string, productId: string, opts: RunOptions): Promise<RawReview[]> {
  let reportedTotal: number | null = null;
  const seen = new Set<string>();
  const raw: Record<string, unknown>[] = [];
  let noNewStreak = 0;
  const target = () => Math.min(opts.maxItems, reportedTotal ?? opts.maxItems);

  await paginate(
    async (page) => {
      let res: Response;
      try {
        res = await fetch(talkstoreReviewApiUrl(store, productId, page - 1, PAGE_SIZE), {
          headers: { accept: "application/json" },
          credentials: "include"
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 톡스토어 리뷰를 불러오지 못했습니다.");
      }
      if (res.status === 401) throw new CollectError("LOGIN", "톡스토어에 로그인한 뒤 다시 시도해 주세요.");
      if (res.status === 403 || res.status === 429) {
        throw new CollectError("BLOCKED", "톡스토어가 리뷰 요청을 제한했습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (!res.ok || !(res.headers.get("content-type") || "").includes("json")) {
        throw new CollectError("UNSUPPORTED", `톡스토어 리뷰를 불러오지 못했습니다(status ${res.status}).`);
      }
      const parsed = parseTalkstorePage(await res.json().catch(() => null));
      if (parsed.totalCount > 0) reportedTotal = Math.max(reportedTotal ?? 0, parsed.totalCount);
      let added = 0;
      for (const entry of parsed.contents) {
        if (raw.length >= target()) break;
        const id = entry.id;
        if (typeof id === "string" && id.length > 0) {
          if (seen.has(id)) continue;
          seen.add(id);
        }
        raw.push(entry);
        added++;
      }
      noNewStreak = added === 0 ? noNewStreak + 1 : 0;
      opts.onProgress?.(raw.length, reportedTotal);
      return {
        // 같은 페이지만 반복 반환되면(중복뿐) 두 번 연속에서 종료 — 무한 루프 방지.
        items: noNewStreak >= 2 && raw.length < target() ? [] : parsed.contents,
        totalPages: parsed.last ? page : undefined,
        total: reportedTotal ?? undefined
      };
    },
    {
      maxItems: opts.maxItems,
      pageSize: PAGE_SIZE,
      delayMs: randomDelay(COLLECT_PAGE_DELAY_MIN_MS, COLLECT_PAGE_DELAY_MAX_MS),
      sleep: realSleep,
      shouldCancel: () => !!opts.shouldCancel?.() || raw.length >= target()
    }
  );

  const reviews = raw.map((r) => normalizeTalkstoreReview(r));
  opts.onSummary?.({
    reportedTotal,
    requested: opts.maxItems,
    collected: reviews.length,
    textReviews: reviews.filter((r) => r.text.trim().length > 0).length,
    partial: reviews.length < Math.min(opts.maxItems, reportedTotal ?? opts.maxItems)
  });
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}
