import { CollectError } from "./types";

export type PageResult<T> = { items: T[]; totalPages?: number; total?: number };
export type PageFetch<T> = (page: number) => Promise<PageResult<T>>;

export type CollectOptions = {
  maxItems: number;
  pageSize: number;
  delayMs: () => number;
  sleep: (ms: number) => Promise<void>;
  onProgress?: (collected: number, total: number | null) => void;
  shouldCancel?: () => boolean;
};

const MAX_TRANSIENT_RETRY = 3;

/**
 * 페이지네이션 공통 루프. 정중함(페이지 간 지연)·한도·취소·차단 처리.
 * - BLOCKED/LOGIN 등 단말 오류는 즉시 전파.
 * - NETWORK 등 일시 오류는 백오프 재시도, 이미 모은 게 있으면 그 시점까지만 반환.
 */
export async function paginate<T>(fetchPage: PageFetch<T>, opts: CollectOptions): Promise<T[]> {
  const out: T[] = [];
  let totalPages = Number.POSITIVE_INFINITY;

  for (let page = 1; page <= totalPages; page++) {
    if (opts.shouldCancel?.()) break;

    let res: PageResult<T>;
    try {
      res = await fetchWithRetry(fetchPage, page, opts.sleep);
    } catch (err) {
      if (out.length > 0 && !(err instanceof CollectError && err.code !== "NETWORK")) break;
      throw err;
    }

    if (typeof res.totalPages === "number" && res.totalPages > 0) totalPages = res.totalPages;
    if (res.items.length === 0) break;
    out.push(...res.items);

    const total =
      typeof res.total === "number" && res.total > 0
        ? res.total
        : Number.isFinite(totalPages)
          ? totalPages * opts.pageSize
          : null;
    opts.onProgress?.(out.length, total);

    if (out.length >= opts.maxItems) break;
    if (page < totalPages) await opts.sleep(opts.delayMs());
  }

  return out.slice(0, opts.maxItems);
}

async function fetchWithRetry<T>(
  fetchPage: PageFetch<T>,
  page: number,
  sleep: (ms: number) => Promise<void>
): Promise<PageResult<T>> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < MAX_TRANSIENT_RETRY; attempt++) {
    try {
      return await fetchPage(page);
    } catch (err) {
      // 단말 오류(차단/로그인 등)는 재시도하지 않는다.
      if (err instanceof CollectError && err.code !== "NETWORK") throw err;
      lastErr = err;
      await sleep(300 * (attempt + 1));
    }
  }
  throw lastErr ?? new CollectError("NETWORK", "리뷰를 불러오지 못했습니다.");
}

export function randomDelay(min: number, max: number): () => number {
  return () => min + Math.floor(Math.random() * Math.max(0, max - min));
}

export function realSleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
