import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./csrf";

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
