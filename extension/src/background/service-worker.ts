import { AUTH_STORAGE_KEY, REPORT_STORAGE_KEY } from "../lib/config";
import type { ExternalRequest, ExternalResponse } from "../lib/messages";

/**
 * externally_connectable 로 열린 ReviewBoost 페이지의 요청 처리.
 * - PULL_REPORT: 리포트 페이지가 분석 payload를 가져갈 때 응답.
 * - AUTH_TOKEN: 계정 연결 페이지가 발급한 익스텐션 토큰 저장.
 * payload/token 은 chrome.storage.local 에만 보관된다.
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
  if (req?.type === "AUTH_TOKEN" && typeof req.token === "string" && req.token) {
    chrome.storage.local
      .set({ [AUTH_STORAGE_KEY]: { token: req.token, expiresAt: Number(req.expiresAt) || 0 } })
      .then(() => sendResponse({ ok: true } satisfies ExternalResponse));
    return true;
  }
  return false;
});
