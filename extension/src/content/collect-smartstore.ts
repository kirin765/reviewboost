import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeSmartstoreReview } from "../lib/normalize";
import {
  buildQueryPagesRequest,
  extractSmartstoreProductNo,
  findMerchantNo,
  findOriginProductNo,
  parseSmartstorePage
} from "../lib/smartstore";
import { CollectError, type RawReview } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 20; // query-pages 캡처에서 확인된 값

function readPreloadState(): unknown {
  const w = window as unknown as Record<string, unknown>;
  return w.__PRELOADED_STATE__ ?? w.__PRELOAD_STATE__ ?? null;
}

function resourceUrls(): string[] {
  try {
    return performance.getEntriesByType("resource").map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * checkoutMerchantNo 와 originProductNo 는 둘 다 페이지가 보낸 리뷰 요청 URL에 있다
 * (merchant=쿼리, origin=경로). 클릭 시점에 아직 없으면 최대 ~4초 폴링.
 */
async function resolveIds(): Promise<{ merchant: string; origin: string } | null> {
  const fallbackOrigin = extractSmartstoreProductNo(location.pathname) ?? "";
  for (let i = 0; i < 12; i++) {
    const urls = resourceUrls();
    const merchant = findMerchantNo(urls, readPreloadState());
    const origin = findOriginProductNo(urls);
    if (merchant && origin) return { merchant, origin };
    await realSleep(350);
  }
  const urls = resourceUrls();
  const merchant = findMerchantNo(urls, readPreloadState());
  if (!merchant) return null;
  return { merchant, origin: findOriginProductNo(urls) ?? fallbackOrigin };
}

export async function collectSmartstore(opts: RunOptions): Promise<RawReview[]> {
  if (!extractSmartstoreProductNo(location.pathname)) {
    throw new CollectError("NOT_PRODUCT", "스마트스토어 상품 페이지가 아닙니다.");
  }

  const ids = await resolveIds();
  if (!ids || !ids.origin) {
    throw new CollectError(
      "EMPTY",
      "리뷰 정보를 찾지 못했습니다. 리뷰 영역이 보이도록 한 번 스크롤한 뒤 다시 시도해 주세요."
    );
  }

  const raw = await paginate(
    async (page) => {
      const req = buildQueryPagesRequest(ids.merchant, ids.origin, page, PAGE_SIZE, location.origin);
      let res: Response;
      try {
        res = await fetch(req.url, {
          method: req.method,
          credentials: "include",
          headers: { accept: "application/json", "content-type": "application/json" },
          body: req.body
        });
      } catch {
        throw new CollectError("NETWORK", "네트워크 오류로 리뷰를 불러오지 못했습니다.");
      }
      if (res.status === 403) {
        throw new CollectError("BLOCKED", "네이버가 자동 요청을 차단했습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (res.status === 204) return { items: [] }; // 리뷰 없음
      const ct = res.headers.get("content-type") || "";
      if (res.status >= 400 || !ct.includes("json")) {
        throw new CollectError("UNSUPPORTED", `스마트스토어 리뷰를 불러오지 못했습니다(status ${res.status}).`);
      }
      const json = await res.json().catch(() => null);
      const { contents, total, totalPages } = parseSmartstorePage(json);
      return { items: contents, total, totalPages };
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

  const reviews = cleanReviews(raw.map((r) => normalizeSmartstoreReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 리뷰가 없습니다.");
  return reviews;
}
