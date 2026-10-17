/**
 * 팝업 수집 옵션 — chrome.storage.local 에 저장해 다음 수집에도 유지한다.
 * 기본값: 별점만 있는 리뷰도 포함(true). 끄면 본문이 있는 리뷰만 수집·다운로드한다.
 */
import { PREFERENCES_STORAGE_KEY } from "./config";

export type PopupPreferences = {
  includeBlankText: boolean;
};

export const DEFAULT_PREFERENCES: PopupPreferences = {
  includeBlankText: true
};

/** 저장된 옵션을 읽는다 — 없거나 손상됐으면 기본값. */
export function normalizePreferences(raw: unknown): PopupPreferences {
  const r = (raw ?? {}) as Partial<PopupPreferences>;
  return {
    includeBlankText: typeof r.includeBlankText === "boolean" ? r.includeBlankText : DEFAULT_PREFERENCES.includeBlankText
  };
}

export async function loadPreferences(): Promise<PopupPreferences> {
  try {
    const data = await chrome.storage.local.get(PREFERENCES_STORAGE_KEY);
    return normalizePreferences((data as Record<string, unknown>)[PREFERENCES_STORAGE_KEY]);
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: PopupPreferences): Promise<void> {
  await chrome.storage.local.set({ [PREFERENCES_STORAGE_KEY]: prefs });
}
