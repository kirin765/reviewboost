import { REPORT_STORAGE_KEY } from "../lib/config";
import type { ExternalRequest, ExternalResponse } from "../lib/messages";

/**
 * ReviewBoost 리포트 페이지(externally_connectable)가 분석 payload를 가져갈 때 응답.
 * payload는 사용자가 방금 수집한 본인 데이터이며 chrome.storage.local 에만 보관된다.
 */
chrome.runtime.onMessageExternal.addListener((req: ExternalRequest, _sender, sendResponse) => {
  if (req?.type === "PULL_REPORT") {
    chrome.storage.local.get(REPORT_STORAGE_KEY).then((data) => {
      const payload = (data as Record<string, unknown>)[REPORT_STORAGE_KEY] ?? null;
      const resp: ExternalResponse = payload ? { ok: true, payload } : { ok: false };
      sendResponse(resp);
    });
    return true; // async sendResponse
  }
  return false;
});
