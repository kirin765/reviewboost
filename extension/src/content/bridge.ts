/**
 * Firefox 전용 리뷰 페이지 ↔ 익스텐션 브리지.
 *
 * reviewboost.co.kr 에 주입되어, 웹 페이지가 `window.postMessage` 로 보낸
 * PULL_REPORT / AUTH_TOKEN 요청을 background 로 중계하고 응답을 되돌려준다.
 * (Firefox 는 externally_connectable 을 지원하지 않아 웹 페이지가
 *  chrome.runtime.sendMessage 를 직접 호출할 수 없다 — bug 1319168.)
 *
 * 보안: 이 스크립트는 reviewboost.co.kr 에서만 주입되고, `event.origin` 이
 * 현재 페이지 origin 과 일치하는 메시지만 처리한다. 따라서 임의의 웹 페이지가
 * 브리지를 통해 리포트/토큰에 접근할 수 없다.
 */

import { buildBridgeResponse, isBridgeRequest, toExtensionRequest } from "../lib/bridge";
import type { ExternalResponse } from "../lib/messages";

function sendToBackground(type: "PULL_REPORT" | "AUTH_TOKEN", token?: string, expiresAt?: number): Promise<ExternalResponse | undefined> {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage(
        { type, token, expiresAt },
        (response: ExternalResponse | undefined) => {
          resolve(response);
        }
      );
    } catch {
      resolve(undefined);
    }
  });
}

if (!(window as unknown as Record<string, unknown>).__rbBridgeInstalled) {
  (window as unknown as Record<string, unknown>).__rbBridgeInstalled = true;

  window.addEventListener("message", (event: MessageEvent) => {
    if (event.source !== window) return;
    if (event.origin !== location.origin) return;
    if (!isBridgeRequest(event.data)) return;

    const { requestId, token, expiresAt } = event.data;
    const req = toExtensionRequest(event.data);

    void sendToBackground(req.type, token, expiresAt).then((response) => {
      window.postMessage(
        buildBridgeResponse(requestId, {
          ok: Boolean(response?.ok),
          payload: response?.ok ? response.payload : undefined
        }),
        location.origin
      );
    });
  });
}
