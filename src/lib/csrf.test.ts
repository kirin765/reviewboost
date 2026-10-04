import { describe, expect, it } from "vitest";
import { extensionOrigin, isExtensionOrigin, isSameOriginRequest } from "./csrf";

function req(headers: Record<string, string>) {
  return new Request("https://reviewboost.co.kr/api/analyze", { method: "POST", headers });
}

describe("isSameOriginRequest", () => {
  it("accepts a matching Origin header", () => {
    expect(isSameOriginRequest(req({ origin: "https://reviewboost.co.kr" }))).toBe(true);
  });

  it("rejects a mismatched Origin header", () => {
    expect(isSameOriginRequest(req({ origin: "https://evil.example" }))).toBe(false);
  });

  it("honours x-forwarded-host / x-forwarded-proto when present", () => {
    expect(
      isSameOriginRequest(
        req({
          origin: "https://app.reviewboost.co.kr",
          "x-forwarded-host": "app.reviewboost.co.kr",
          "x-forwarded-proto": "https"
        })
      )
    ).toBe(true);
  });

  it("falls back to the Referer origin when Origin is absent", () => {
    expect(isSameOriginRequest(req({ referer: "https://reviewboost.co.kr/dashboard" }))).toBe(true);
    expect(isSameOriginRequest(req({ referer: "https://evil.example/x" }))).toBe(false);
  });

  it("fails closed when neither Origin nor Referer is present", () => {
    expect(isSameOriginRequest(req({}))).toBe(false);
  });
});

describe("isExtensionOrigin / extensionOrigin", () => {
  it("accepts Chrome and Firefox extension origins", () => {
    expect(isExtensionOrigin("chrome-extension://abcdefghijklmnopabcdefghijklmnop")).toBe(true);
    expect(isExtensionOrigin("moz-extension://3f6a1c2e-9b4d-4e5f-8a1b-2c3d4e5f6a7b")).toBe(true);
  });

  it("rejects web origins and malformed extension ids", () => {
    expect(isExtensionOrigin("https://reviewboost.co.kr")).toBe(false);
    expect(isExtensionOrigin("chrome-extension://not-an-id")).toBe(false);
    expect(isExtensionOrigin("moz-extension://nope")).toBe(false);
    expect(isExtensionOrigin(null)).toBe(false);
  });

  it("reads the Origin header and returns it only for extension requests", () => {
    expect(extensionOrigin(req({ origin: "moz-extension://3f6a1c2e-9b4d-4e5f-8a1b-2c3d4e5f6a7b" }))).toBe(
      "moz-extension://3f6a1c2e-9b4d-4e5f-8a1b-2c3d4e5f6a7b"
    );
    expect(extensionOrigin(req({ origin: "https://evil.example" }))).toBeNull();
    expect(extensionOrigin(req({}))).toBeNull();
  });
});
