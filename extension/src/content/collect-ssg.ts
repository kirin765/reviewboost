import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { parseSsgPage, ssgReviewListUrl } from "../lib/ssg";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeSsgReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 10; // ssg ajaxItemCommentList pageSize=10 (실측)

/** 페이지 URL 에서 siteNo 추출(기본 6004) — SSG 채널별 siteNo 가 다르다. */
function siteNoFromHref(): string {
  return new URL(location.href).searchParams.get("siteNo") ?? "6004";
}

/** 상품명 추정 — 리뷰 API의 itemNm 파라미터 (비어도 동작하지만 정확도용). */
function itemNameGuess(): string {
  const el = document.querySelector("h1, h2.mdtit, .mdtit, .itemtit, .cunit_name");
  return (el?.textContent ?? document.title).trim().slice(0, 200);
}

export async function collectSsg(itemId: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const siteNo = siteNoFromHref();
  const itemNm = itemNameGuess();
  const canonicalUrl = `${location.origin}${location.pathname}?itemId=${encodeURIComponent(itemId)}`;

  const raw = await paginate(
    async (page) => {
      const url = ssgReviewListUrl(itemId, siteNo, page, PAGE_SIZE, itemNm, canonicalUrl);
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
        throw new CollectError("BLOCKED", "SSG닷컴이 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
      }
      if (res.status >= 400) {
        throw new CollectError("UNSUPPORTED", `SSG닷컴 리뷰를 불러오지 못했습니다(status ${res.status}).`);
      }
      const html = await res.text().catch(() => "");
      const doc = new DOMParser().parseFromString(html, "text/html");
      return { items: parseSsgPage(doc) };
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

  const reviews = cleanReviews(raw.map((r) => normalizeSsgReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}