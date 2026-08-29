import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { paginate, randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeSmartstoreReview } from "../lib/normalize";
import {
  buildGroupProductReviewRequest,
  buildProductSummaryReviewRequest,
  buildQueryPagesRequest,
  extractSmartstoreProductNo,
  findGroupProductNo,
  findMerchantNo,
  findOriginProductNo,
  isBrandHost,
  mapChannelToOrigin,
  normalizeCapturedHeaders,
  parseSmartstorePage,
  preloadOriginProductNo,
  withPage,
  type SmartstoreReviewRequest
} from "../lib/smartstore";
import { CollectError, type RawReview } from "../lib/types";
import { clientAuthHeaders, readCapturedRequest, readInlineState, triggerReviewSectionLoad } from "./hook";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 20; // query-pages 캡처에서 확인된 값

function resourceUrls(): string[] {
  try {
    return performance.getEntriesByType("resource").map((e) => e.name);
  } catch {
    return [];
  }
}

/**
 * ① 캡처(페이지가 직접 보낸 요청) ② 묶음상품 GET ③ 일반 상품(브랜드=GET / 스마트스토어=POST) 순으로 확보.
 * 브랜드스토어는 URL productNo 가 채널상품번이라 원본상품번과 다르고, 묶음상품은 groupProductNo 를 쓴다.
 */
async function resolveRequest(): Promise<SmartstoreReviewRequest | null> {
  const captured = readCapturedRequest();
  if (captured) return { ...captured, headers: normalizeCapturedHeaders(captured.headers) };

  const preload = readInlineState("__PRELOADED_STATE__");
  const brand = isBrandHost(location.hostname);
  const urlProductNo = extractSmartstoreProductNo(location.pathname) ?? "";

  for (let i = 0; i < 12; i++) {
    const urls = resourceUrls();
    const merchant = findMerchantNo(urls, preload);
    const groupNo = findGroupProductNo(urls);
    if (merchant && groupNo) {
      const req = buildGroupProductReviewRequest(merchant, groupNo, 1, PAGE_SIZE, location.origin);
      req.headers = { ...clientAuthHeaders(urls), accept: "application/json" };
      return req;
    }
    const origin =
      findOriginProductNo(urls) ?? preloadOriginProductNo(preload) ?? mapChannelToOrigin(preload, urlProductNo);
    if (merchant && origin) {
      const req = brand
        ? buildProductSummaryReviewRequest(merchant, origin, 1, PAGE_SIZE, location.origin)
        : buildQueryPagesRequest(merchant, origin, 1, PAGE_SIZE, location.origin);
      req.headers = { ...clientAuthHeaders(urls), accept: "application/json", "content-type": "application/json" };
      return req;
    }
    await realSleep(350);
  }

  const triggered = await triggerReviewSectionLoad(realSleep);
  if (triggered) return { ...triggered, headers: normalizeCapturedHeaders(triggered.headers) };
  return null;
}

async function collectWithRequest(
  request: SmartstoreReviewRequest,
  opts: RunOptions
): Promise<RawReview[]> {
  const raw = await paginate(
    async (page) => {
      const req = withPage(request, page, PAGE_SIZE);
      let res: Response;
      try {
        const headers: Record<string, string> = { accept: "application/json", ...req.headers };
        if (req.body) headers["content-type"] = "application/json";
        res = await fetch(req.url, {
          method: req.method,
          credentials: "include",
          headers,
          ...(req.body ? { body: req.body } : {})
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

export async function collectSmartstore(opts: RunOptions): Promise<RawReview[]> {
  if (!extractSmartstoreProductNo(location.pathname)) {
    throw new CollectError("NOT_PRODUCT", "스마트스토어 상품 페이지가 아닙니다.");
  }

  let request = await resolveRequest();
  if (!request) {
    throw new CollectError(
      "EMPTY",
      "리뷰 정보를 찾지 못했습니다. 리뷰 영역이 보이도록 한 번 스크롤한 뒤 다시 시도해 주세요."
    );
  }

  try {
    return await collectWithRequest(request, opts);
  } catch (err) {
    // 히리스틱 요청이 200+HTML(또는 4xx/5xx) 로 실패했고 그 사이 페이지가 실제 리뷰 요청을 보냈다면
    // 그 요청을 그대로 재사용해 재시도한다 (본문/헤더 필드명 차이 자동 흡수).
    if (
      err instanceof CollectError &&
      (err.code === "UNSUPPORTED" || err.code === "NETWORK") &&
      isBrandHost(location.hostname)
    ) {
      const captured = readCapturedRequest();
      if (captured) {
        return await collectWithRequest({ ...captured, headers: normalizeCapturedHeaders(captured.headers) }, opts);
      }
    }
    throw err;
  }
}
