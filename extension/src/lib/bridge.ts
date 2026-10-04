/**
 * ReviewBoost 웹 페이지 ↔ 익스텐션 브리지 프로토콜.
 *
 * Chrome 은 `externally_connectable` 로 웹 페이지가 `chrome.runtime.sendMessage` 를
 * 직접 호출할 수 있지만, Firefox 는 이 키를 지원하지 않는다 (bug 1319168).
 * 그래서 Firefox 빌드에서는 reviewboost.co.kr 에 주입한 content script(bridge.js)가
 * `window.postMessage` 를 받아 background 로 중계하고, 응답을 다시 페이지로 돌려준다.
 *
 * 여기에는 두 세계가 공유하는 순수 상수/타입/가드만 둔다 (테스트 대상).
 */

/** 웹 페이지 → content script 요청의 식별자 (스푸핑 방지용 source 태그). */
export const BRIDGE_PAGE_SOURCE = "rb-extension-page";

/** content script → 웹 페이지 응답의 식별자. */
export const BRIDGE_EXT_SOURCE = "rb-extension";

export type BridgeRequestType = "PULL_REPORT" | "AUTH_TOKEN";

export type BridgeRequest = {
  source: typeof BRIDGE_PAGE_SOURCE;
  type: BridgeRequestType;
  requestId: string;
  token?: string;
  expiresAt?: number;
};

export type BridgeResponse = {
  source: typeof BRIDGE_EXT_SOURCE;
  requestId: string;
  ok: boolean;
  payload?: unknown;
};

/** 페이지가 보낸 메시지가 우리 브리지 요청인지 검사한다. */
export function isBridgeRequest(data: unknown): data is BridgeRequest {
  const d = data as Partial<BridgeRequest> | null | undefined;
  return (
    !!d &&
    d.source === BRIDGE_PAGE_SOURCE &&
    typeof d.requestId === "string" &&
    d.requestId.length > 0 &&
    (d.type === "PULL_REPORT" || d.type === "AUTH_TOKEN")
  );
}

/** background 응답을 웹 페이지가 읽을 수 있는 봉투로 감싼다. */
export function buildBridgeResponse(
  requestId: string,
  result: { ok: boolean; payload?: unknown }
): BridgeResponse {
  return {
    source: BRIDGE_EXT_SOURCE,
    requestId,
    ok: result.ok,
    ...(result.payload !== undefined ? { payload: result.payload } : {})
  };
}

/** 웹 페이지가 보낸 요청을 background 로 넘길 때 쓰는 메시지 형태. */
export function toExtensionRequest(req: BridgeRequest): { type: BridgeRequestType; token?: string; expiresAt?: number } {
  if (req.type === "AUTH_TOKEN") {
    return { type: req.type, token: req.token, expiresAt: req.expiresAt };
  }
  return { type: req.type };
}
