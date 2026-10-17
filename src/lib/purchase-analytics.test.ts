import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPurchaseEvent, sendPurchaseAnalytics } from "./purchase-analytics";
const now = Date.now();
const data = {
  id: "txn_123", currency_code: "KRW", details: { totals: { total: "4900", tax: "445" } },
  custom_data: { ga_client_id: "123.456", ga_session_id: "123", ga_checkout_at: String(now), acquisition_source: "naver", email: "private@example.com" }
};
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("verified purchase analytics", () => {
  it("uses actual currency units, excludes tax from revenue, and includes no email", () => {
    const event = buildPurchaseEvent(data, "extension", now)!;
    expect(event.client_id).toBe("123.456");
    expect(event.events[0].params).toMatchObject({ transaction_id: "txn_123", currency: "KRW", value: 4455, tax: 445, session_id: "123" });
    expect(JSON.stringify(event)).not.toContain("private");
    expect(buildPurchaseEvent({ ...data, currency_code: "USD", details: { totals: { total: "1000", tax: "0" } } }, "basic", now)!.events[0].params.value).toBe(10);
  });
  it("does not manufacture identity or revenue from missing/invalid data", () => {
    expect(buildPurchaseEvent({ ...data, custom_data: {} }, "extension")).toBeNull();
    expect(buildPurchaseEvent({ ...data, details: {} }, "extension")).toBeNull();
    expect(buildPurchaseEvent({ ...data, details: { totals: { total: "invalid" } } }, "extension")).toBeNull();
  });
  it("does not attribute next month's renewal to the old checkout session", () => {
    const renewal = buildPurchaseEvent(data, "extension", now + 30 * 86400000)!;
    expect(renewal.events[0].params).not.toHaveProperty("session_id");
  });
  it("skips sandbox payments and requests without an analytics identity", async () => {
    vi.stubEnv("GA4_API_SECRET", "test-secret"); vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST"); vi.stubEnv("PADDLE_ENV", "sandbox");
    const fetch = vi.fn(); vi.stubGlobal("fetch", fetch);
    expect(await sendPurchaseAnalytics(data, "extension")).toBe("skipped");
    expect(fetch).not.toHaveBeenCalled();
  });
  it("keeps transaction IDs stable on retry and returns a secret-free error for delivery failure", async () => {
    vi.stubEnv("GA4_API_SECRET", "private-secret"); vi.stubEnv("NEXT_PUBLIC_GA_MEASUREMENT_ID", "G-TEST"); vi.stubEnv("PADDLE_ENV", "live"); vi.stubEnv("VERCEL_ENV", "production");
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal("fetch", fetch);
    await sendPurchaseAnalytics(data, "extension"); await sendPurchaseAnalytics(data, "extension");
    const bodies = fetch.mock.calls.map(call => JSON.parse(call[1].body));
    expect(bodies[0].events[0].params.transaction_id).toBe(bodies[1].events[0].params.transaction_id);
    fetch.mockRejectedValue(new Error("request url private-secret"));
    await expect(sendPurchaseAnalytics(data, "extension")).rejects.toThrow(/^purchase analytics delivery failed$/);
  });
});
