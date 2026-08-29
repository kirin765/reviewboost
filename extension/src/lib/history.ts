/**
 * 최근 수집 내역 — chrome.storage.local 에 최대 HISTORY_LIMIT 건 보관.
 * 팝업을 닫아도 직전 수집 결과를 복원할 수 있게 한다 (다운로드/분석 재사용).
 */
import { HISTORY_STORAGE_KEY } from "./config";
import type { Platform, RawReview } from "./types";

export type HistoryEntry = {
  id: string;
  platform: Platform;
  productId: string;
  productUrl: string;
  productTitle: string;
  count: number;
  createdAt: number;
  reviews: RawReview[];
};

export const HISTORY_LIMIT = 5;

export function makeHistoryId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const data = await chrome.storage.local.get(HISTORY_STORAGE_KEY);
  const arr = (data as Record<string, unknown>)[HISTORY_STORAGE_KEY];
  if (!Array.isArray(arr)) return [];
  return arr.filter((e): e is HistoryEntry => !!e && typeof e === "object" && Array.isArray((e as HistoryEntry).reviews));
}

/** 새 기록을 맨 앞에 넣고 최대 HISTORY_LIMIT 건으로 자른다. */
export async function addHistory(entry: HistoryEntry): Promise<HistoryEntry[]> {
  const list = await loadHistory();
  const next = [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, HISTORY_LIMIT);
  await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: next });
  return next;
}

export async function removeHistory(id: string): Promise<HistoryEntry[]> {
  const list = await loadHistory();
  const next = list.filter((e) => e.id !== id);
  await chrome.storage.local.set({ [HISTORY_STORAGE_KEY]: next });
  return next;
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.remove(HISTORY_STORAGE_KEY);
}
