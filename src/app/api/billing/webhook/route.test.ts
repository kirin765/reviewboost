import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertProfileCustomer: vi.fn(),
  findUserIdByPaddleCustomerId: vi.fn(),
  upsertSubscription: vi.fn(),
  paddlePlanForPriceId: vi.fn()
}));

vi.mock("@/lib/billing", () => ({
  upsertProfileCustomer: mocks.upsertProfileCustomer,
  findUserIdByPaddleCustomerId: mocks.findUserIdByPaddleCustomerId,
  upsertSubscription: mocks.upsertSubscription
}));

vi.mock("@/lib/paddle", () => ({
  paddlePlanForPriceId: mocks.paddlePlanForPriceId
}));

import { POST } from "./route";

function signedRequest(body: unknown, secret = "whsec_test") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  const ts = "1700000000";
  const h1 = createHmac("sha256", secret).update(`${ts}:${payload}`, "utf8").digest("hex");

  return new Request("https://reviewboost.app/api/billing/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "paddle-signature": `ts=${ts};h1=${h1}`
    },
    body: payload
  });
}

describe("POST /api/billing/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PADDLE_WEBHOOK_SECRET = "whsec_test";
    process.env.PADDLE_BASIC_PRICE_ID = "pri_basic";
    process.env.PADDLE_PRO_PRICE_ID = "pri_pro";
    mocks.paddlePlanForPriceId.mockImplementation((priceId: string | null | undefined) =>
      priceId === "pri_pro" ? "pro" : priceId === "pri_basic" ? "basic" : "free"
    );
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue("user-from-profile");
  });

  it("returns 400 for invalid signatures", async () => {
    const req = new Request("https://reviewboost.app/api/billing/webhook", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "paddle-signature": "ts=1700000000;h1=deadbeef"
      },
      body: JSON.stringify({ event_type: "transaction.completed", data: {} })
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toEqual({ error: "invalid signature" });
  });

  it("returns 500 when webhook secret is missing", async () => {
    delete process.env.PADDLE_WEBHOOK_SECRET;

    const req = signedRequest({ event_type: "transaction.completed", data: {} }, "whsec_test");
    const res = await POST(req);

    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: "webhook secret missing" });
  });

  it("maps transaction.completed user_id and customer_id to profile and backfills subscription entitlement", async () => {
    const req = signedRequest({
      event_type: "transaction.completed",
      data: {
        custom_data: { user_id: "user-123" },
        customer_id: "ctm_123",
        subscription_id: "sub_123",
        status: "completed",
        items: [{ price: { id: "pri_basic" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-123", "ctm_123");
    expect(mocks.paddlePlanForPriceId).toHaveBeenCalledWith("pri_basic");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-123",
      paddleSubscriptionId: "sub_123",
      paddleCustomerId: "ctm_123",
      paddlePriceId: "pri_basic",
      status: "completed",
      planTier: "basic",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    });
  });

  it("maps transaction.completed with nested subscription.billing_period to upsert payload", async () => {
    const req = signedRequest({
      event_type: "transaction.completed",
      data: {
        custom_data: { user_id: "user-period" },
        customer_id: "ctm_period",
        subscription_id: "sub_period",
        status: "active",
        items: [{ price: { id: "pri_pro" } }],
        subscription: {
          id: "sub_period",
          current_billing_period: {
            starts_at: "2026-02-01T00:00:00Z",
            ends_at: "2026-03-01T00:00:00Z"
          }
        }
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-period",
      paddleSubscriptionId: "sub_period",
      paddleCustomerId: "ctm_period",
      paddlePriceId: "pri_pro",
      status: "active",
      planTier: "pro",
      currentPeriodStart: "2026-02-01T00:00:00Z",
      currentPeriodEnd: "2026-03-01T00:00:00Z",
      cancelAtPeriodEnd: false
    });
  });

  it("maps transaction.completed with root billing_period to upsert payload", async () => {
    const req = signedRequest({
      event_type: "transaction.completed",
      data: {
        custom_data: { user_id: "user-period-root" },
        customer_id: "ctm_period_root",
        subscription_id: "sub_period_root",
        status: "active",
        items: [{ price: { id: "pri_pro" } }],
        billing_period: {
          starts_at: "2026-02-10T00:00:00Z",
          ends_at: "2026-03-10T00:00:00Z"
        }
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-period-root",
      paddleSubscriptionId: "sub_period_root",
      paddleCustomerId: "ctm_period_root",
      paddlePriceId: "pri_pro",
      status: "active",
      planTier: "pro",
      currentPeriodStart: "2026-02-10T00:00:00Z",
      currentPeriodEnd: "2026-03-10T00:00:00Z",
      cancelAtPeriodEnd: false
    });
  });

  it("handles order.completed by applying entitlement from transaction payload", async () => {
    const req = signedRequest({
      event_type: "order.completed",
      data: {
        custom_data: { user_id: "user-456" },
        customer_id: "ctm_456",
        subscription: { id: "sub_456", status: "active" },
        items: [{ price_id: "pri_pro" }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-456", "ctm_456");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-456",
      paddleSubscriptionId: "sub_456",
      paddleCustomerId: "ctm_456",
      paddlePriceId: "pri_pro",
      status: "active",
      planTier: "pro",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    });
  });

  it("handles transaction.updated by upserting from completed transaction payload", async () => {
    const req = signedRequest({
      event_type: "transaction.updated",
      data: {
        custom_data: { user_id: "user-updated" },
        customer_id: "ctm_updated",
        subscription_id: "sub_updated",
        status: "completed",
        items: [{ price: { id: "pri_basic" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-updated", "ctm_updated");
    expect(mocks.paddlePlanForPriceId).toHaveBeenCalledWith("pri_basic");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-updated",
      paddleSubscriptionId: "sub_updated",
      paddleCustomerId: "ctm_updated",
      paddlePriceId: "pri_basic",
      status: "completed",
      planTier: "basic",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    });
  });

  it("handles subscription.activated as a lifecycle event", async () => {
    const req = signedRequest({
      event_type: "subscription.activated",
      data: {
        id: "sub_act",
        customer_id: "ctm_act",
        status: "active",
        custom_data: { user_id: "user-act" },
        items: [{ price: { id: "pri_pro" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-act", "ctm_act");
    expect(mocks.paddlePlanForPriceId).toHaveBeenCalledWith("pri_pro");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-act",
      paddleSubscriptionId: "sub_act",
      paddleCustomerId: "ctm_act",
      paddlePriceId: "pri_pro",
      status: "active",
      planTier: "pro",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    });
  });

  it("backfills entitlement when subscription event arrives before customer mapping", async () => {
    mocks.findUserIdByPaddleCustomerId.mockResolvedValueOnce(null);

    const earlySubscription = signedRequest({
      event_type: "subscription.updated",
      data: {
        id: "sub_early",
        customer_id: "ctm_race",
        status: "active",
        items: [{ price: { id: "pri_pro" } }]
      }
    });

    const earlyRes = await POST(earlySubscription);
    expect(earlyRes.status).toBe(200);
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();

    const laterOrder = signedRequest({
      event_type: "order.completed",
      data: {
        custom_data: { user_id: "user-race" },
        customer_id: "ctm_race",
        subscription: { id: "sub_early", status: "active" },
        items: [{ price: { id: "pri_pro" } }]
      }
    });

    const orderRes = await POST(laterOrder);
    expect(orderRes.status).toBe(200);
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-race", "ctm_race");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-race",
      paddleSubscriptionId: "sub_early",
      paddleCustomerId: "ctm_race",
      paddlePriceId: "pri_pro",
      status: "active",
      planTier: "pro",
      currentPeriodStart: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false
    });
  });

  it("upserts subscription lifecycle events with mapped billing fields", async () => {
    const req = signedRequest({
      event_type: "subscription.updated",
      data: {
        id: "sub_123",
        customer_id: "ctm_123",
        status: "active",
        custom_data: { user_id: "user-123" },
        items: [{ price: { id: "pri_pro" } }],
        current_billing_period: {
          starts_at: "2026-02-01T00:00:00Z",
          ends_at: "2026-03-01T00:00:00Z"
        },
        scheduled_change: { action: "cancel" }
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-123", "ctm_123");
    expect(mocks.paddlePlanForPriceId).toHaveBeenCalledWith("pri_pro");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith({
      userId: "user-123",
      paddleSubscriptionId: "sub_123",
      paddleCustomerId: "ctm_123",
      paddlePriceId: "pri_pro",
      status: "active",
      planTier: "pro",
      currentPeriodStart: "2026-02-01T00:00:00Z",
      currentPeriodEnd: "2026-03-01T00:00:00Z",
      cancelAtPeriodEnd: true
    });
  });
});
