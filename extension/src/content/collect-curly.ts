import { COLLECT_PAGE_DELAY_MAX_MS, COLLECT_PAGE_DELAY_MIN_MS } from "../lib/config";
import { kurlyReviewUrl, parseKurlyPage, type KurlyPage } from "../lib/kurly";
import { randomDelay, realSleep } from "../lib/collector";
import { cleanReviews, normalizeCurlyReview } from "../lib/normalize";
import { CollectError } from "../lib/types";
import type { RunOptions } from "./collect-coupang";

const PAGE_SIZE = 10; // product-review/v4 size=10 실측
const CURSOR_DONE = ""; // parseKurlyPage 가 "0_0" 을 빈 문자열로 변환

/**
 * 컬리 후기 수집 — 커서 기반 페이지네이션 (paginate 는 정수 페이지 전용이라 직접 루프).
 */
export async function collectCurly(goodsNo: string, opts: RunOptions): Promise<import("../lib/types").RawReview[]> {
  const raw: unknown[] = [];
  let after = CURSOR_DONE;

  for (let guard = 0; guard < 500; guard++) {
    if (opts.shouldCancel?.()) break;

    let page: KurlyPage;
    try {
      page = await fetchKurlyPage(goodsNo, after);
    } catch (err) {
      if (raw.length > 0 && err instanceof CollectError && err.code !== "NETWORK") break;
      throw err;
    }

    if (page.contents.length === 0) break;
    raw.push(...page.contents);
    opts.onProgress?.(raw.length, null);
    if (raw.length >= opts.maxItems) break;
    if (!page.nextCursor) break; // 커서 소진
    after = page.nextCursor;
    await realSleep(randomDelay(COLLECT_PAGE_DELAY_MIN_MS, COLLECT_PAGE_DELAY_MAX_MS)());
  }

  const reviews = cleanReviews(raw.map((r) => normalizeCurlyReview(r as Record<string, unknown>)));
  if (reviews.length === 0) throw new CollectError("EMPTY", "이 상품에는 분석할 후기가 없습니다.");
  return reviews.slice(0, opts.maxItems);
}

async function fetchKurlyPage(goodsNo: string, after: string): Promise<KurlyPage> {
  const url = kurlyReviewUrl(goodsNo, PAGE_SIZE, "RECOMMEND", false, after);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { accept: "application/json" }
    });
  } catch {
    throw new CollectError("NETWORK", "네트워크 오류로 후기를 불러오지 못했습니다.");
  }
  if (res.status === 403 || res.status === 429) {
    throw new CollectError("BLOCKED", "컬리가 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요.");
  }
  if (res.status >= 400 || !(res.headers.get("content-type") || "").includes("json")) {
    throw new CollectError("UNSUPPORTED", `컬리 후기를 불러오지 못했습니다(status ${res.status}).`);
  }
  const json = await res.json().catch(() => null);
  return parseKurlyPage(json);
}