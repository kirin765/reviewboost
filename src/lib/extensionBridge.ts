/**
 * ReviewBoost 웹 페이지 → 리뷰 수집기 익스텐션 요청 헬퍼.
 *
 * Chrome: `externally_connectable` 로 `chrome.runtime.sendMessage(extId, ...)` 직접 호출.
 * Firefox: externally_connectable 미지원(bug 1319168)이라 reviewboost.co.kr 에 주입된
 *          익스텐션 브리지 content script 와 `window.postMessage` 로 통신한다.
 * 두 경로 모두 `{ ok, payload? }` 로 정규화해 호출부가 브라우저를 신경 쓰지 않게 한다.
 */

export const BRIDGE_PAGE_SOURCE = "rb-extension-page";
export const BRIDGE_EXT_SOURCE = "rb-extension";

export const BRIDGE_TIMEOUT_MS = 4000;

export type ExtensionRequestType = "PULL_REPORT" | "AUTH_TOKEN";

export type ExtensionExtra = { token?: string; expiresAt?: number };

export type ExtensionResult = { ok: boolean; payload?: unknown };

type ChromeRuntimeLike = {
  runtime?: {
    sendMessage?: (extensionId: string, message: unknown, cb: (response: unknown) => void) => void;
    lastError?: { message?: string };
  };
};

/** 요청 상관관계용 id — 응답 스푸핑/혼선 방지. */
export function bridgeRequestId(now = Date.now(), rand = Math.random): string {
  return `rb-${now.toString(36)}-${rand().toString(36).slice(2, 8)}`;
}

/** 페이지 → 브리지 content script 봉투. */
export function buildBridgeRequest(
  type: ExtensionRequestType,
  requestId: string,
  extra: ExtensionExtra = {}
): Record<string, unknown> {
  return { source: BRIDGE_PAGE_SOURCE, type, requestId, ...extra };
}

/** 브리지 응답이 우리 요청에 대한 것인지 검사한다. */
export function isBridgeResponse(data: unknown, requestId: string): boolean {
  const d = data as { source?: unknown; requestId?: unknown; ok?: unknown } | null | undefined;
  return !!d && d.source === BRIDGE_EXT_SOURCE && d.requestId === requestId && typeof d.ok === "boolean";
}

function normalize(response: unknown): ExtensionResult {
  const r = response as { ok?: boolean; payload?: unknown } | undefined;
  return { ok: Boolean(r?.ok), ...(r?.payload !== undefined ? { payload: r.payload } : {}) };
}

/** Firefox 경로 — content script 브리지를 통한 postMessage 요청(타임아웃 시 ok:false). */
export function requestViaBridge(
  type: ExtensionRequestType,
  extra: ExtensionExtra = {},
  win: Window = window,
  timeoutMs = BRIDGE_TIMEOUT_MS
): Promise<ExtensionResult> {
  return new Promise((resolve) => {
    const requestId = bridgeRequestId();
    let settled = false;

    const finish = (result: ExtensionResult): void => {
      if (settled) return;
      settled = true;
      win.clearTimeout(timer);
      win.removeEventListener("message", onMessage);
      resolve(result);
    };

    const onMessage = (event: MessageEvent): void => {
      if (event.source !== win) return;
      if (!isBridgeResponse(event.data, requestId)) return;
      finish(normalize(event.data));
    };

    const timer = win.setTimeout(() => finish({ ok: false }), timeoutMs);
    win.addEventListener("message", onMessage);
    win.postMessage(buildBridgeRequest(type, requestId, extra), win.location.origin);
  });
}

/** 브라우저에 맞는 경로를 자동 선택한다. */
export function requestExtension(
  extId: string,
  type: ExtensionRequestType,
  extra: ExtensionExtra = {},
  win: Window = window
): Promise<ExtensionResult> {
  const send = (win as unknown as { chrome?: ChromeRuntimeLike }).chrome?.runtime?.sendMessage;
  if (typeof send === "function") {
    return new Promise((resolve) => {
      try {
        send(extId, { type, ...extra }, (response: unknown) => resolve(normalize(response)));
      } catch {
        resolve({ ok: false });
      }
    });
  }
  return requestViaBridge(type, extra, win);
}
