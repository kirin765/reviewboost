// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import {
  BRIDGE_EXT_SOURCE,
  BRIDGE_PAGE_SOURCE,
  buildBridgeRequest,
  isBridgeResponse,
  requestExtension,
  requestViaBridge
} from "./extensionBridge";

describe("buildBridgeRequest", () => {
  it("tags page requests with the bridge source and request id", () => {
    expect(buildBridgeRequest("PULL_REPORT", "r1")).toEqual({
      source: BRIDGE_PAGE_SOURCE,
      type: "PULL_REPORT",
      requestId: "r1"
    });
    expect(buildBridgeRequest("AUTH_TOKEN", "r2", { token: "t", expiresAt: 5 })).toEqual({
      source: BRIDGE_PAGE_SOURCE,
      type: "AUTH_TOKEN",
      requestId: "r2",
      token: "t",
      expiresAt: 5
    });
  });
});

describe("isBridgeResponse", () => {
  it("accepts only matching, well-formed extension responses", () => {
    expect(isBridgeResponse({ source: BRIDGE_EXT_SOURCE, requestId: "r1", ok: true }, "r1")).toBe(true);
    expect(isBridgeResponse({ source: BRIDGE_EXT_SOURCE, requestId: "r2", ok: true }, "r1")).toBe(false);
    expect(isBridgeResponse({ source: BRIDGE_PAGE_SOURCE, requestId: "r1", ok: true }, "r1")).toBe(false);
    expect(isBridgeResponse({ source: BRIDGE_EXT_SOURCE, requestId: "r1" }, "r1")).toBe(false);
  });
});

describe("requestViaBridge", () => {
  it("resolves with the payload when the content script replies", async () => {
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as { source?: string; type?: string; requestId?: string };
      if (data?.source !== BRIDGE_PAGE_SOURCE || data.type !== "PULL_REPORT") return;
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { source: BRIDGE_EXT_SOURCE, requestId: data.requestId, ok: true, payload: { hello: "world" } },
          source: window
        })
      );
    };
    window.addEventListener("message", onMessage);
    try {
      await expect(requestViaBridge("PULL_REPORT", {}, window, 500)).resolves.toEqual({
        ok: true,
        payload: { hello: "world" }
      });
    } finally {
      window.removeEventListener("message", onMessage);
    }
  });

  it("times out to ok:false when nothing replies", async () => {
    await expect(requestViaBridge("PULL_REPORT", {}, window, 10)).resolves.toEqual({ ok: false });
  });
});

describe("requestExtension", () => {
  it("uses chrome.runtime.sendMessage when available", async () => {
    const sendMessage = vi.fn((_id: string, _msg: unknown, cb: (r: unknown) => void) =>
      cb({ ok: true, payload: { a: 1 } })
    );
    const win = { chrome: { runtime: { sendMessage } } } as unknown as Window;
    await expect(requestExtension("ext-id", "PULL_REPORT", {}, win)).resolves.toEqual({
      ok: true,
      payload: { a: 1 }
    });
    expect(sendMessage).toHaveBeenCalledWith("ext-id", { type: "PULL_REPORT" }, expect.any(Function));
  });

  it("falls back to the postMessage bridge without chrome runtime", async () => {
    const onMessage = (event: MessageEvent): void => {
      const data = event.data as { source?: string; requestId?: string };
      if (data?.source !== BRIDGE_PAGE_SOURCE) return;
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { source: BRIDGE_EXT_SOURCE, requestId: data.requestId, ok: true },
          source: window
        })
      );
    };
    window.addEventListener("message", onMessage);
    try {
      await expect(requestExtension("ext-id", "AUTH_TOKEN", { token: "t" }, window)).resolves.toEqual({
        ok: true
      });
    } finally {
      window.removeEventListener("message", onMessage);
    }
  });
});
