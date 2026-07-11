import { createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { billingToIso, normalizeSubscriptionStatus } from "../src/lib/billing";
import { paddlePlanForPriceId } from "../src/lib/paddle";
import {
  extractCustomerId,
  extractPriceId,
  extractUserId,
  normalizeSubscriptionPayload,
  parsePaddleSignature,
  verifyPaddleSignature
} from "../src/lib/paddleWebhook";

describe("parsePaddleSignature", () => {
  it("parses comma-separated header", () => {
    expect(parsePaddleSignature("ts=123,h1=abc")).toEqual({ ts: "123", h1: "abc" });
  });

  it("parses semicolon-separated header", () => {
    expect(parsePaddleSignature("ts=123; h1=abc")).toEqual({ ts: "123", h1: "abc" });
  });

  it("returns null for invalid header", () => {
    expect(parsePaddleSignature("h1=abc")).toBeNull();
  });
});

describe("verifyPaddleSignature", () => {
  const secret = "whsec_test";
  const body = "{\"hello\":\"world\"}";
  const nowMs = 1_700_000_000_000;
  const ts = String(nowMs / 1000);
  const h1 = createHmac("sha256", secret).update(`${ts}:${body}`, "utf8").digest("hex");

  it("returns true when signature matches and timestamp is fresh", () => {
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, secret, { nowMs })).toBe(true);
  });

  it("returns false when the timestamp is outside the tolerance window (replay)", () => {
    const stale = nowMs + 301_000; // 301s later, default tolerance is 300s
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, secret, { nowMs: stale })).toBe(false);
  });

  it("still verifies a stale timestamp when tolerance is disabled", () => {
    const stale = nowMs + 10 * 60_000;
    expect(verifyPaddleSignature(body, `ts=${ts};h1=${h1}`, secret, { nowMs: stale, toleranceSeconds: Infinity })).toBe(true);
  });

  it("returns false when signature mismatches", () => {
    expect(verifyPaddleSignature("{\"a\":1}", "ts=1;h1=deadbeef", "secret", { toleranceSeconds: Infinity })).toBe(false);
  });

  it("returns false when digest lengths mismatch", () => {
    expect(verifyPaddleSignature("{\"a\":1}", "ts=1;h1=x", "secret", { toleranceSeconds: Infinity })).toBe(false);
  });
});

describe("payload helpers", () => {
  it("extracts customer and user ids with priority", () => {
    const payload = {
      customer_id: "ctm_primary",
      customer: { id: "ctm_secondary" },
      custom_data: { user_id: "user_custom" },
      metadata: { user_id: "user_meta" }
    };
    expect(extractCustomerId(payload)).toBe("ctm_primary");
    expect(extractUserId(payload)).toBe("user_custom");
  });

  it("extracts price id from different item shapes", () => {
    expect(extractPriceId({ items: [{ price: { id: "pri_1" } }] })).toBe("pri_1");
    expect(extractPriceId({ items: [{ price_id: "pri_2" }] })).toBe("pri_2");
    expect(extractPriceId({ items: { data: [{ price: { id: "pri_3" } }] } })).toBe("pri_3");
  });

  it("normalizes subscription payload with missing period", () => {
    const normalized = normalizeSubscriptionPayload({
      id: "sub_1",
      customer_id: "ctm_1",
      status: "active",
      items: [{ price: { id: "pri_1" } }]
    });

    expect(normalized).toEqual({
      id: "sub_1",
      customerId: "ctm_1",
      status: "active",
      userId: null,
      priceId: "pri_1",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    });
  });

  it("returns null when required subscription identifiers are missing", () => {
    expect(normalizeSubscriptionPayload({ customer_id: "ctm_1" })).toBeNull();
    expect(normalizeSubscriptionPayload({ id: "sub_1" })).toBeNull();
  });
});

describe("billing helpers", () => {
  it("converts ISO string and unix timestamps", () => {
    expect(billingToIso("2025-01-01T00:00:00Z")).toBe("2025-01-01T00:00:00.000Z");
    expect(billingToIso(1_700_000_000)).toBe("2023-11-14T22:13:20.000Z");
  });

  it("supports millisecond epoch and invalid values", () => {
    expect(billingToIso(1_700_000_000_000)).toBe("2023-11-14T22:13:20.000Z");
    expect(billingToIso("not-a-date")).toBeNull();
  });

  it("normalizes unknown status to inactive", () => {
    expect(normalizeSubscriptionStatus("ACTIVE")).toBe("active");
    expect(normalizeSubscriptionStatus("random-status")).toBe("inactive");
  });

  it("falls back to free for unknown price id", () => {
    process.env.PADDLE_BASIC_PRICE_ID = "pri_basic";
    process.env.PADDLE_PRO_PRICE_ID = "pri_pro";
    expect(paddlePlanForPriceId("pri_unknown")).toBe("free");
    expect(paddlePlanForPriceId("pri_pro")).toBe("pro");
  });
});
