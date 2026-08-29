/**
 * 브랜드스토어/스마트스토어 페이지의 "리뷰 API 요청 캡처" 브리지.
 *
 * content script 은 isolated world 라서 페이지의 window 전역(fetch/XHR, __PRELOADED_STATE__,
 * __CLIENT_RTK_RTS_STATE__)에 접근할 수 없다. 그래서:
 *   1. captureHookMainWorld(): chrome.scripting.executeScript(world:"MAIN") 로 페이지에 주입한다.
 *      페이지의 fetch/XHR 을 감싸 리뷰 query-pages 요청(url/body/headers)을 DOM attribute 에 기록한다.
 *      인라인 <script> 주입은 브랜드스토어 CSP 가 막으므로('script-src ... chrome-extension' 에
 *      'unsafe-inline' 없음) 반드시 이 경로를 쓴다.
 *   2. readCapturedRequest(): 그 attribute 를 content script 쪽에서 읽는다.
 *   3. readInlineState(name): 인라인 <script> 텍스트에서 window.__X__= {...} JSON 을 파싱한다
 *      (preload state, RTK/RTS). DOM 은 두 world 가 공유하므로 script textContent 는 읽을 수 있다.
 */

import type { SmartstoreReviewRequest } from "../lib/smartstore";

const CAPTURE_ATTR = "data-rb-review-capture";

/** MAIN world 에서 실행되는 훅 본문 (chrome.scripting.executeScript 의 func 로 직렬화된다). */
export function captureHookMainWorld(): void {
  const w = window as unknown as Record<string, unknown>;
  if (w.__rbReviewCaptureInstalled) return;
  w.__rbReviewCaptureInstalled = true;

  const setCapture = (url: unknown, method: unknown, body: unknown, headers: unknown): void => {
    try {
      document.documentElement.setAttribute(
        CAPTURE_ATTR,
        JSON.stringify({
          url: String(url),
          method: String(method),
          body: typeof body === "string" ? body : JSON.stringify(body),
          headers: headers || {}
        })
      );
    } catch {
      /* ignore */
    }
  };

  const proto = XMLHttpRequest.prototype;
  const origOpen = proto.open;
  proto.open = function (this: XMLHttpRequest & { __rbUrl?: string; __rbMethod?: string; __rbHeaders?: Record<string, string> }, method, url) {
    try {
      this.__rbUrl = String(url);
      this.__rbMethod = String(method);
      this.__rbHeaders = {};
    } catch {
      /* ignore */
    }
    return origOpen.apply(this, arguments as never);
  };
  const origSet = proto.setRequestHeader;
  proto.setRequestHeader = function (this: XMLHttpRequest & { __rbHeaders?: Record<string, string> }, k, v) {
    try {
      if (this.__rbHeaders) this.__rbHeaders[String(k)] = String(v);
    } catch {
      /* ignore */
    }
    return origSet.apply(this, arguments as never);
  };
  const origSend = proto.send;
  proto.send = function (this: XMLHttpRequest & { __rbUrl?: string; __rbMethod?: string; __rbHeaders?: Record<string, string> }, body) {
    try {
      const u = this.__rbUrl;
      if (u && u.indexOf("/contents/reviews/query-pages") !== -1) {
        setCapture(u, this.__rbMethod || "POST", body, this.__rbHeaders);
      }
    } catch {
      /* ignore */
    }
    return origSend.apply(this, arguments as never);
  };

  const origFetch = window.fetch;
  if (typeof origFetch === "function") {
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      try {
        const url = typeof input === "string" ? input : input && "url" in input ? String(input.url) : "";
        if (url && url.indexOf("/contents/reviews/query-pages") !== -1) {
          setCapture(url, (init && init.method) || "POST", init && init.body, (init && init.headers) || {});
        }
      } catch {
        /* ignore */
      }
      return origFetch.apply(this, arguments as never);
    };
  }
}

/**
 * content script → service worker 에 MAIN world 훅 주입을 요청한다.
 * (chrome.scripting.executeScript 는 SW 쪽에서 실행해야 하며 CSP 를 우회한다)
 */
export function installReviewCaptureHook(): void {
  try {
    void chrome.runtime.sendMessage({ type: "INSTALL_HOOK" } as never).catch(() => {});
  } catch {
    // SW 미응답은 치명적이지 않다 — 히리스틱 경로로 폴백
  }
}

/** 페이지가 직접 보낸 query-pages 요청 (마지막 캡처). 없으면 null. */
export function readCapturedRequest(): SmartstoreReviewRequest | null {
  try {
    const raw = document.documentElement.getAttribute(CAPTURE_ATTR);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { url?: string; method?: string; body?: string; headers?: Record<string, string> };
    if (!parsed.url || typeof parsed.body !== "string") return null;
    return {
      url: parsed.url,
      method: "POST",
      body: parsed.body,
      headers: parsed.headers
    };
  } catch {
    return null;
  }
}

/** 리뷰 영역이 아직 요청을 안 보냈을 때 스크롤로 로드를 유도하고 캡처를 기다린다. */
export async function triggerReviewSectionLoad(
  waitMs: (ms: number) => Promise<void>,
  timeoutMs = 6000
): Promise<SmartstoreReviewRequest | null> {
  const selectors = [
    'section[class*="review" i]',
    'div[class*="review" i]',
    'button[class*="review" i]',
    '[id*="REVIEW"]',
    '[class*="Review"]'
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) {
      (el as HTMLElement).scrollIntoView?.({ block: "start", behavior: "auto" });
      break;
    }
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const c = readCapturedRequest();
    if (c) return c;
    await waitMs(300);
  }
  return null;
}

/** 인라인 <script> 의 `window.{name}= {…}` 값을 파싱 (isolated world 호환).
 *  브랜드스토어는 객체 리터럴을 그대로 덤프해서 `undefined`/`NaN`/trailing comma 등
 *  JSON 이 아닌 구문이 섞여 있다 — 파싱 전에 걸러낸다. */
export function readInlineState(name: string): unknown {
  const prefix = `window.${name}=`;
  const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>("script"));
  for (const s of scripts) {
    const text = s.textContent || "";
    const i = text.indexOf(prefix);
    if (i < 0) continue;
    const rest = sanitizeJsonish(text.slice(i + prefix.length).trim().replace(/;\s*$/, ""));
    if (!rest) continue;
    try {
      return JSON.parse(rest);
    } catch {
      // 객체 리터럴 뒤에 다른 구문이 이어지는 경우 잘라본다.
      const cut = rest.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
      if (cut) {
        try {
          return JSON.parse(cut[0]);
        } catch {
          /* next script */
        }
      }
    }
  }
  return null;
}

/** JS 객체 리터럴을 JSON 으로 다듬는다: undefined/NaN/Infinity 값 → null, trailing comma 제거. */
export function sanitizeJsonish(s: string): string {
  const values = s
    .replace(/([{\[,:])\s*undefined(?=\s*[,}\]])/g, "$1null")
    .replace(/([{\[,:])\s*NaN(?=\s*[,}\]])/g, "$1null")
    .replace(/([{\[,:])\s*Infinity(?=\s*[,}\]])/g, "$1null");
  return stripTrailingCommas(values);
}

/** 문자열 안의 `,}`·`,]`는 건드리지 않고, 객체/배열 뒤의 trailing comma 만 제거. */
function stripTrailingCommas(s: string): string {
  let out = "";
  let inString = false;
  let esc = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      out += ch;
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === ",") {
      let j = i + 1;
      while (j < s.length && (s[j] === " " || s[j] === "\t" || s[j] === "\n" || s[j] === "\r")) j++;
      if (j < s.length && (s[j] === "}" || s[j] === "]")) continue;
    }
    out += ch;
  }
  return out;
}

/** x-client-rtk/rts/lct/version 헤더 — 브랜드스토어 API 가 페이지에서 요구하는 헤더. */
export function clientAuthHeaders(resourceUrls: string[]): Record<string, string> {
  const headers: Record<string, string> = {};
  const state = readInlineState("__CLIENT_RTK_RTS_STATE__") as { RTK?: unknown; RTS?: unknown } | null;
  if (state && typeof state.RTK === "string" && state.RTK) headers["x-client-rtk"] = state.RTK;
  if (state && typeof state.RTS === "string" && state.RTS) headers["x-client-rts"] = state.RTS;
  headers["x-client-lct"] = location.pathname;
  for (const u of resourceUrls) {
    const m = u.match(/brandstore\/p\/static\/([\w.]+)\/js\/main\.[\w.]+\.js/);
    if (m) {
      headers["x-client-version"] = m[1];
      break;
    }
  }
  return headers;
}
