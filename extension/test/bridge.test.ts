import { describe, expect, it } from "vitest";
import {
  BRIDGE_EXT_SOURCE,
  BRIDGE_PAGE_SOURCE,
  buildBridgeResponse,
  isBridgeRequest,
  toExtensionRequest
} from "../src/lib/bridge";

describe("isBridgeRequest", () => {
  it("accepts PULL_REPORT / AUTH_TOKEN envelopes from the page", () => {
    expect(isBridgeRequest({ source: BRIDGE_PAGE_SOURCE, type: "PULL_REPORT", requestId: "r1" })).toBe(true);
    expect(
      isBridgeRequest({ source: BRIDGE_PAGE_SOURCE, type: "AUTH_TOKEN", requestId: "r2", token: "t" })
    ).toBe(true);
  });

  it("rejects stray page messages and extension responses", () => {
    expect(isBridgeRequest(null)).toBe(false);
    expect(isBridgeRequest({ type: "PULL_REPORT", requestId: "r1" })).toBe(false);
    expect(isBridgeRequest({ source: BRIDGE_PAGE_SOURCE, type: "PING", requestId: "r1" })).toBe(false);
    expect(isBridgeRequest({ source: BRIDGE_PAGE_SOURCE, type: "PULL_REPORT", requestId: "" })).toBe(false);
    expect(isBridgeRequest({ source: BRIDGE_EXT_SOURCE, type: "PULL_REPORT", requestId: "r1" })).toBe(false);
  });
});

describe("buildBridgeResponse", () => {
  it("tags responses and tucks in the payload when present", () => {
    expect(buildBridgeResponse("r1", { ok: true, payload: { a: 1 } })).toEqual({
      source: BRIDGE_EXT_SOURCE,
      requestId: "r1",
      ok: true,
      payload: { a: 1 }
    });
    expect(buildBridgeResponse("r2", { ok: false })).toEqual({
      source: BRIDGE_EXT_SOURCE,
      requestId: "r2",
      ok: false
    });
  });
});

describe("toExtensionRequest", () => {
  it("carries auth fields only for AUTH_TOKEN", () => {
    expect(
      toExtensionRequest({ source: BRIDGE_PAGE_SOURCE, type: "AUTH_TOKEN", requestId: "r", token: "t", expiresAt: 123 })
    ).toEqual({ type: "AUTH_TOKEN", token: "t", expiresAt: 123 });
    expect(toExtensionRequest({ source: BRIDGE_PAGE_SOURCE, type: "PULL_REPORT", requestId: "r" })).toEqual({
      type: "PULL_REPORT"
    });
  });
});
