import { AUTH_STORAGE_KEY, REPORT_STORAGE_KEY } from "../lib/config";
import type { ExternalRequest, ExternalResponse } from "../lib/messages";
import { captureHookMainWorld } from "../content/hook";

/**
 * 웹 페이지(또는 Firefox 브리지 content script)가 보낸 권한 요청 처리.
 * - PULL_REPORT: 리포트 페이지가 분석 payload를 가져갈 때 응답.
 * - AUTH_TOKEN: 계정 연결 페이지가 발급한 익스텐션 토큰 저장.
 * payload/token 은 chrome.storage.local 에만 보관된다.
 * async 응답을 위해 true 를 반환하면 메시지 채널이 열린 상태로 유지된다.
 */
function handlePageRequest(req: ExternalRequest, sendResponse: (resp: ExternalResponse) => void): boolean {
  if (req?.type === "PULL_REPORT") {
    chrome.storage.local.get(REPORT_STORAGE_KEY).then((data) => {
      const payload = (data as Record<string, unknown>)[REPORT_STORAGE_KEY] ?? null;
      sendResponse(payload ? { ok: true, payload } : { ok: false });
    });
    return true;
  }
  if (req?.type === "AUTH_TOKEN" && typeof req.token === "string" && req.token) {
    chrome.storage.local
      .set({ [AUTH_STORAGE_KEY]: { token: req.token, expiresAt: Number(req.expiresAt) || 0 } })
      .then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
}

/**
 * content script → SW: 페이지 MAIN world 에 리뷰 요청 캡처 훅을 주입한다.
 * chrome.scripting.executeScript(world:"MAIN") 는 페이지 CSP 를 우회한다
 * (브랜드스토어는 'unsafe-inline' 없는 CSP 라 인라인 <script> 주입이 막힌다).
 *
 * 같은 리스너에서 Firefox 브리지가 보낸 PULL_REPORT/AUTH_TOKEN 도 처리한다
 * (Firefox 는 externally_connectable 이 없어 웹 페이지가 직접 보낼 수 없다).
 */
chrome.runtime.onMessage.addListener((msg: unknown, sender, sendResponse) => {
  const type = (msg as { type?: string })?.type;
  if (type === "INSTALL_HOOK") {
    if (sender.tab?.id != null) {
      void chrome.scripting
        .executeScript({ target: { tabId: sender.tab.id }, world: "MAIN", func: captureHookMainWorld })
        .catch(() => {});
    }
    return false;
  }
  if (type === "PULL_REPORT" || type === "AUTH_TOKEN") {
    return handlePageRequest(msg as ExternalRequest, sendResponse as (resp: ExternalResponse) => void);
  }
  return false;
});

/**
 * Chrome externally_connectable 경로 — ReviewBoost 페이지가 직접 보낸 요청.
 * Firefox 에서는 externally_connectable 이 없어 이 이벤트가 웹 페이지에서 오지 않는다.
 */
chrome.runtime.onMessageExternal?.addListener((req: ExternalRequest, _sender, sendResponse) => {
  return handlePageRequest(req, sendResponse as (resp: ExternalResponse) => void);
});
