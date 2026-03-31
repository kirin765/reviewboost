import { afterEach, describe, expect, it, vi } from "vitest";

import {
  appBaseUrl,
  isPaddleConfigured,
  paddleBrowserToken,
  paddleEnv,
  paddlePlanForPriceId,
  paddlePriceIdForPlan,
  paddleRequest
} from "./paddle";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("paddle config", () => {
  it("defaults to sandbox when PADDLE_ENV is missing or empty", () => {
    vi.stubEnv("PADDLE_ENV", "");
    expect(paddleEnv()).toBe("sandbox");

    vi.unstubAllEnvs();
    expect(paddleEnv()).toBe("sandbox");
  });

  it("throws on invalid paddle environment", () => {
    vi.stubEnv("PADDLE_ENV", "dev");
    expect(() => paddleEnv()).toThrow("PADDLE_ENV must be either 'sandbox' or 'live'");
  });

  it("checks complete config with trimmed env values", () => {
    vi.stubEnv("PADDLE_ENV", "live");
    vi.stubEnv("PADDLE_API_KEY", "  key_123  ");
    vi.stubEnv("PADDLE_BASIC_PRICE_ID", " pri_basic ");
    vi.stubEnv("PADDLE_PRO_PRICE_ID", "pri_pro");
    expect(isPaddleConfigured()).toBe(true);

    vi.stubEnv("PADDLE_PRO_PRICE_ID", "   ");
    expect(isPaddleConfigured()).toBe(false);
  });

  it("returns false from isPaddleConfigured for invalid env", () => {
    vi.stubEnv("PADDLE_ENV", "oops");
    vi.stubEnv("PADDLE_API_KEY", "key");
    vi.stubEnv("PADDLE_BASIC_PRICE_ID", "basic");
    vi.stubEnv("PADDLE_PRO_PRICE_ID", "pro");
    expect(isPaddleConfigured()).toBe(false);
  });

  it("throws explicit errors for missing plan price ids", () => {
    vi.stubEnv("PADDLE_BASIC_PRICE_ID", "");
    vi.stubEnv("PADDLE_PRO_PRICE_ID", "pri_pro_01");

    expect(() => paddlePriceIdForPlan("basic")).toThrow("PADDLE_BASIC_PRICE_ID is not set for plan 'basic'");
    expect(paddlePriceIdForPlan("pro")).toBe("pri_pro_01");
  });

  it("maps price ids to plans and unknown values to free", () => {
    vi.stubEnv("PADDLE_BASIC_PRICE_ID", "pri_basic");
    vi.stubEnv("PADDLE_PRO_PRICE_ID", "pri_pro");

    expect(paddlePlanForPriceId("pri_basic")).toBe("basic");
    expect(paddlePlanForPriceId("pri_pro")).toBe("pro");
    expect(paddlePlanForPriceId("unknown")).toBe("free");
    expect(paddlePlanForPriceId("   ")).toBe("free");
    expect(paddlePlanForPriceId(undefined)).toBe("free");
  });

  it("normalizes APP_BASE_URL and strips trailing slash", () => {
    vi.stubEnv("APP_BASE_URL", "https://example.com/base/");
    expect(appBaseUrl(new Request("https://fallback.test/any"))).toBe("https://example.com/base");
  });

  it("throws explicit error for invalid APP_BASE_URL", () => {
    vi.stubEnv("APP_BASE_URL", "not-a-url");
    expect(() => appBaseUrl(new Request("https://fallback.test/any"))).toThrow("APP_BASE_URL must be a valid absolute URL");
  });

  it("falls back to request URL when APP_BASE_URL is unset", () => {
    vi.stubEnv("APP_BASE_URL", "");
    expect(appBaseUrl(new Request("https://sub.domain.dev/path?q=1"))).toBe("https://sub.domain.dev");
  });

  it("prefers the live public token when running in live mode", () => {
    vi.stubEnv("PADDLE_ENV", "live");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_TOKEN_LIVE", "live_public");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_TOKEN", "legacy_public");

    expect(paddleBrowserToken()).toBe("live_public");
  });

  it("falls back to the legacy public token when the environment-specific token is absent", () => {
    vi.stubEnv("PADDLE_ENV", "sandbox");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_TOKEN_SANDBOX", "");
    vi.stubEnv("NEXT_PUBLIC_PADDLE_TOKEN", "legacy_public");

    expect(paddleBrowserToken()).toBe("legacy_public");
  });
});

describe("paddleRequest", () => {
  it("calls sandbox endpoint by default and returns data payload", async () => {
    vi.stubEnv("PADDLE_ENV", "sandbox");
    vi.stubEnv("PADDLE_API_KEY", "key_test");

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: "txn_1" } })
    } as Response);

    const result = await paddleRequest("/transactions", { body: { amount: 1000 } });

    expect(result).toEqual({ id: "txn_1" });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://sandbox-api.paddle.com/transactions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer key_test"
        })
      })
    );
  });

  it("throws explicit error when request path is invalid", async () => {
    vi.stubEnv("PADDLE_API_KEY", "key_test");
    await expect(paddleRequest("transactions")).rejects.toThrow("Paddle request path must start with '/'");
  });

  it("throws API error detail message on non-ok response", async () => {
    vi.stubEnv("PADDLE_API_KEY", "key_test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: { detail: "Invalid payload" } })
    } as Response);

    await expect(paddleRequest("/transactions")).rejects.toThrow("Invalid payload");
  });

  it("uses top-level string error message when error field is string", async () => {
    vi.stubEnv("PADDLE_API_KEY", "key_test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ error: "URL called is invalid." })
    } as Response);

    await expect(paddleRequest("/transactions")).rejects.toThrow("URL called is invalid.");
  });

  it("throws fallback status error for invalid json error bodies", async () => {
    vi.stubEnv("PADDLE_API_KEY", "key_test");
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "upstream unavailable"
    } as Response);

    await expect(paddleRequest("/transactions")).rejects.toThrow("Paddle request failed (502)");
  });
});
