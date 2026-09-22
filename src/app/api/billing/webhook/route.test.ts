import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsertProfileCustomer: vi.fn(),
  findUserIdByPaddleCustomerId: vi.fn(),
  upsertSubscription: vi.fn(),
  findUserIdByEmail: vi.fn(),
  upsertPendingSubscription: vi.fn(),
  paddlePlanForPriceId: vi.fn(),
  fetchPaddleCustomerEmail: vi.fn(),
  recordFunnelEvent: vi.fn(),
  recordFunnelEventOnce: vi.fn()
}));

vi.mock("@/lib/billing", () => ({
  upsertProfileCustomer: mocks.upsertProfileCustomer,
  findUserIdByPaddleCustomerId: mocks.findUserIdByPaddleCustomerId,
  upsertSubscription: mocks.upsertSubscription,
  upsertPendingSubscription: mocks.upsertPendingSubscription
}));

vi.mock("@/lib/clerk_bridge", () => ({
  findUserIdByEmail: mocks.findUserIdByEmail
}));

vi.mock("@/lib/paddle", () => ({
  paddlePlanForPriceId: mocks.paddlePlanForPriceId,
  fetchPaddleCustomerEmail: mocks.fetchPaddleCustomerEmail
}));

vi.mock("@/lib/db/queries", () => ({
  recordFunnelEvent: mocks.recordFunnelEvent,
  recordFunnelEventOnce: mocks.recordFunnelEventOnce
}));

import { POST } from "./route";

function signedRequest(body: unknown, secret = "whsec_test") {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  // Current timestamp so it passes the webhook replay-tolerance window.
  const ts = String(Math.floor(Date.now() / 1000));
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
    delete process.env.PADDLE_WEBHOOK_SECRETS;
    process.env.PADDLE_BASIC_PRICE_ID = "pri_basic";
    process.env.PADDLE_PRO_PRICE_ID = "pri_pro";
    mocks.paddlePlanForPriceId.mockImplementation((priceId: string | null | undefined) =>
      priceId === "pri_pro" ? "pro" : priceId === "pri_basic" ? "basic" : "free"
    );
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue("user-from-profile");
    mocks.fetchPaddleCustomerEmail.mockResolvedValue(null);
    // 결제 알림은 최초 1회 삽입 시 발송. 기본값 true 로 두고 개별 테스트에서 조정한다.
    mocks.recordFunnelEventOnce.mockResolvedValue(true);
    // 셸에 텔레그램 env 가 있어도 테스트가 실제 네트워크로 나가지 않도록 정리한다.
    delete process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN;
    delete process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID;
    delete process.env.BILLING_ALERT_TELEGRAM_BOT_TOKEN;
    delete process.env.BILLING_ALERT_TELEGRAM_CHAT_ID;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
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

  it("accepts a signature signed with a secret from PADDLE_WEBHOOK_SECRETS", async () => {
    process.env.PADDLE_WEBHOOK_SECRET = "whsec_old";
    process.env.PADDLE_WEBHOOK_SECRETS = "pdl_ntfset_new_one,pdl_ntfset_new_two";
    try {
      const req = signedRequest({ event_type: "unknown.event", data: {} }, "pdl_ntfset_new_two");
      const res = await POST(req);
      expect(res.status).toBe(200);
      await expect(res.json()).resolves.toEqual({ received: true });
    } finally {
      delete process.env.PADDLE_WEBHOOK_SECRETS;
    }
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

  it("records extension_payment_completed with the transaction id as dedupe key", async () => {
    mocks.paddlePlanForPriceId.mockReturnValue("extension");

    const req = signedRequest({
      event_type: "transaction.completed",
      event_id: "evt_ext_1",
      data: {
        id: "txn_ext_1",
        custom_data: { user_id: "user-ext" },
        customer_id: "ctm_ext",
        subscription_id: "sub_ext",
        status: "completed",
        items: [{ price: { id: "pri_ext" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "extension_payment_completed",
      "user-ext",
      expect.objectContaining({ event_id: "evt_ext_1" }),
      "txn_ext_1"
    );
  });

  it("falls back to the event id as dedupe key when the transaction id is missing", async () => {
    mocks.paddlePlanForPriceId.mockReturnValue("extension");

    const req = signedRequest({
      event_type: "transaction.completed",
      event_id: "evt_ext_2",
      data: {
        custom_data: { user_id: "user-ext" },
        customer_id: "ctm_ext",
        subscription_id: "sub_ext",
        status: "completed",
        items: [{ price: { id: "pri_ext" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "extension_payment_completed",
      "user-ext",
      expect.anything(),
      "evt_ext_2"
    );
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
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
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

  it("links a guest transaction to an existing user by email when user_id is absent", async () => {
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
    mocks.findUserIdByEmail.mockResolvedValue("user-by-email");
    mocks.paddlePlanForPriceId.mockReturnValue("extension");

    const req = signedRequest({
      event_type: "transaction.completed",
      event_id: "evt_guest_1",
      data: {
        id: "txn_guest_1",
        custom_data: { plan_tier: "extension" },
        customer: { id: "ctm_guest", email_address: "Guest@Example.com" },
        subscription_id: "sub_guest",
        status: "completed",
        items: [{ price: { id: "pri_ext" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.findUserIdByEmail).toHaveBeenCalledWith("guest@example.com");
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-by-email", "ctm_guest");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-by-email", paddleSubscriptionId: "sub_guest" })
    );
    expect(mocks.upsertPendingSubscription).not.toHaveBeenCalled();
  });

  it("stores a pending subscription when the guest email has no account yet", async () => {
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
    mocks.findUserIdByEmail.mockResolvedValue(null);
    mocks.paddlePlanForPriceId.mockReturnValue("extension");

    const req = signedRequest({
      event_type: "subscription.created",
      event_id: "evt_pending_1",
      data: {
        id: "sub_pending",
        custom_data: { plan_tier: "extension" },
        customer: { id: "ctm_pending", email_address: "new@example.com" },
        status: "active",
        items: [{ price: { id: "pri_ext" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertPendingSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        paddleSubscriptionId: "sub_pending",
        paddleCustomerId: "ctm_pending",
        planTier: "extension",
        status: "active"
      })
    );
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
    expect(mocks.upsertProfileCustomer).not.toHaveBeenCalled();
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "extension_payment_completed",
      null,
      expect.objectContaining({ email: "new@example.com", pending: true }),
      "sub_pending"
    );
  });

  it("logs user_mapping_missing when neither user_id nor customer email exists", async () => {
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);

    const req = signedRequest({
      event_type: "subscription.updated",
      data: {
        custom_data: {},
        customer_id: "ctm_orphan",
        subscription_id: "sub_orphan",
        status: "active",
        items: [{ price: { id: "pri_basic" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
    expect(mocks.upsertPendingSubscription).not.toHaveBeenCalled();
    expect(mocks.upsertProfileCustomer).not.toHaveBeenCalled();
  });

  it("backfills the guest email via Paddle API when the payload has no email", async () => {
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
    mocks.fetchPaddleCustomerEmail.mockResolvedValue("guest@example.com");
    mocks.findUserIdByEmail.mockResolvedValue("user-by-email");
    mocks.paddlePlanForPriceId.mockReturnValue("extension");

    const req = signedRequest({
      event_type: "transaction.completed",
      event_id: "evt_guest_fetch",
      data: {
        id: "txn_guest_fetch",
        custom_data: { plan_tier: "extension" },
        customer_id: "ctm_guest_fetch",
        subscription_id: "sub_guest_fetch",
        status: "completed",
        items: [{ price: { id: "pri_ext" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.fetchPaddleCustomerEmail).toHaveBeenCalledWith("ctm_guest_fetch");
    expect(mocks.findUserIdByEmail).toHaveBeenCalledWith("guest@example.com");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-by-email", paddleSubscriptionId: "sub_guest_fetch" })
    );
    expect(mocks.upsertPendingSubscription).not.toHaveBeenCalled();
  });

  it("stores a pending subscription using the email fetched from Paddle when no account exists", async () => {
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
    mocks.fetchPaddleCustomerEmail.mockResolvedValue("new@example.com");
    mocks.findUserIdByEmail.mockResolvedValue(null);
    mocks.paddlePlanForPriceId.mockReturnValue("extension");

    const req = signedRequest({
      event_type: "transaction.completed",
      event_id: "evt_pending_fetch",
      data: {
        id: "txn_pending_fetch",
        custom_data: { plan_tier: "extension" },
        customer_id: "ctm_pending_fetch",
        subscription_id: "sub_pending_fetch",
        status: "completed",
        items: [{ price: { id: "pri_ext" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertPendingSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "new@example.com",
        paddleSubscriptionId: "sub_pending_fetch",
        planTier: "extension"
      })
    );
    expect(mocks.upsertSubscription).not.toHaveBeenCalled();
  });

  it("handles transaction.paid as an entitlement event", async () => {
    const req = signedRequest({
      event_type: "transaction.paid",
      data: {
        custom_data: { user_id: "user-paid" },
        customer_id: "ctm_paid",
        subscription_id: "sub_paid",
        status: "paid",
        items: [{ price: { id: "pri_pro" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.upsertProfileCustomer).toHaveBeenCalledWith("user-paid", "ctm_paid");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-paid",
        paddleSubscriptionId: "sub_paid",
        planTier: "pro"
      })
    );
  });

  it("records billing_webhook_failed when the guest cannot be mapped", async () => {
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
    mocks.fetchPaddleCustomerEmail.mockResolvedValue(null);

    const req = signedRequest({
      event_type: "transaction.completed",
      event_id: "evt_unmapped",
      data: {
        custom_data: {},
        customer_id: "ctm_unmapped",
        subscription_id: "sub_unmapped",
        status: "completed",
        items: [{ price: { id: "pri_basic" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "billing_webhook_failed",
      null,
      expect.objectContaining({ reason: "user_mapping_missing", customer_id: "ctm_unmapped" }),
      "evt_unmapped"
    );
  });

  it("posts an admin alert to BILLING_ALERT_WEBHOOK_URL on mapping failure", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    process.env.BILLING_ALERT_WEBHOOK_URL = "https://ntfy.sh/test-topic";
    try {
      mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
      mocks.fetchPaddleCustomerEmail.mockResolvedValue(null);

      const req = signedRequest({
        event_type: "transaction.completed",
        event_id: "evt_alert",
        data: {
          custom_data: {},
          customer_id: "ctm_alert",
          subscription_id: "sub_alert",
          status: "completed",
          items: [{ price: { id: "pri_basic" } }]
        }
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://ntfy.sh/test-topic",
        expect.objectContaining({ method: "POST" })
      );
    } finally {
      delete process.env.BILLING_ALERT_WEBHOOK_URL;
      fetchSpy.mockRestore();
    }
  });

  it("posts a Telegram alert when Telegram env is configured", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    process.env.BILLING_ALERT_TELEGRAM_BOT_TOKEN = "bot123";
    process.env.BILLING_ALERT_TELEGRAM_CHAT_ID = "999";
    try {
      mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
      mocks.fetchPaddleCustomerEmail.mockResolvedValue(null);

      const req = signedRequest({
        event_type: "transaction.completed",
        event_id: "evt_tg",
        data: {
          custom_data: {},
          customer_id: "ctm_tg",
          subscription_id: "sub_tg",
          status: "completed",
          items: [{ price: { id: "pri_basic" } }]
        }
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.telegram.org/botbot123/sendMessage",
        expect.objectContaining({ method: "POST" })
      );
    } finally {
      delete process.env.BILLING_ALERT_TELEGRAM_BOT_TOKEN;
      delete process.env.BILLING_ALERT_TELEGRAM_CHAT_ID;
      fetchSpy.mockRestore();
    }
  });

  it("sends a Telegram payment notification on transaction.completed", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN = "notifybot";
    process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID = "111";
    mocks.paddlePlanForPriceId.mockReturnValue("extension");
    try {
      const req = signedRequest({
        event_type: "transaction.completed",
        event_id: "evt_pay_1",
        data: {
          id: "txn_pay_1",
          custom_data: { user_id: "user-pay" },
          customer_id: "ctm_pay",
          customer: { email_address: "buyer@example.com" },
          subscription_id: "sub_pay",
          status: "completed",
          currency_code: "KRW",
          details: { totals: { total: "4900" } },
          items: [{ price: { id: "pri_ext" } }]
        }
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.telegram.org/botnotifybot/sendMessage",
        expect.objectContaining({ method: "POST" })
      );
      const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
      expect(body.chat_id).toBe("111");
      expect(body.text).toContain("신규 결제");
      expect(body.text).toContain("buyer@example.com");
      expect(body.text).toContain("₩4,900");
    } finally {
      delete process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN;
      delete process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID;
      fetchSpy.mockRestore();
    }
  });

  it("notifies once per transaction and records it with the transaction dedupe key", async () => {
    mocks.paddlePlanForPriceId.mockReturnValue("extension");

    const req = signedRequest({
      event_type: "transaction.completed",
      event_id: "evt_pay_dedupe",
      data: {
        id: "txn_pay_dedupe",
        custom_data: { user_id: "user-pay" },
        customer_id: "ctm_pay",
        subscription_id: "sub_pay",
        status: "completed",
        items: [{ price: { id: "pri_ext" } }]
      }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.recordFunnelEventOnce).toHaveBeenCalledWith(
      "billing_payment_received",
      "user-pay",
      expect.objectContaining({ paddle_subscription_id: "sub_pay" }),
      "payment:txn_pay_dedupe"
    );
  });

  it("skips the payment notification when the transaction was already notified", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN = "notifybot";
    process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID = "111";
    mocks.recordFunnelEventOnce.mockResolvedValue(false);
    mocks.paddlePlanForPriceId.mockReturnValue("extension");
    try {
      const req = signedRequest({
        event_type: "transaction.completed",
        event_id: "evt_pay_dup",
        data: {
          id: "txn_pay_dup",
          custom_data: { user_id: "user-pay" },
          customer_id: "ctm_pay",
          subscription_id: "sub_pay",
          status: "completed",
          items: [{ price: { id: "pri_ext" } }]
        }
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(fetchSpy).not.toHaveBeenCalledWith(
        "https://api.telegram.org/botnotifybot/sendMessage",
        expect.anything()
      );
    } finally {
      delete process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN;
      delete process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID;
      fetchSpy.mockRestore();
    }
  });

  it("still notifies when the guest has no account (pending) and fallback Telegram env is used", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    process.env.BILLING_ALERT_TELEGRAM_BOT_TOKEN = "alertbot";
    process.env.BILLING_ALERT_TELEGRAM_CHAT_ID = "222";
    mocks.findUserIdByPaddleCustomerId.mockResolvedValue(null);
    mocks.findUserIdByEmail.mockResolvedValue(null);
    mocks.paddlePlanForPriceId.mockReturnValue("extension");
    try {
      const req = signedRequest({
        event_type: "transaction.completed",
        event_id: "evt_pay_pending",
        data: {
          id: "txn_pay_pending",
          custom_data: { plan_tier: "extension" },
          customer: { id: "ctm_pending_pay", email_address: "new@example.com" },
          subscription_id: "sub_pending_pay",
          status: "completed",
          items: [{ price: { id: "pri_ext" } }]
        }
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      expect(mocks.upsertPendingSubscription).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.telegram.org/botalertbot/sendMessage",
        expect.objectContaining({ method: "POST" })
      );
    } finally {
      delete process.env.BILLING_ALERT_TELEGRAM_BOT_TOKEN;
      delete process.env.BILLING_ALERT_TELEGRAM_CHAT_ID;
      fetchSpy.mockRestore();
    }
  });

  it("notifies for a non-ReviewBoost product payment without touching entitlement", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue({ ok: true } as Response);
    process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN = "notifybot";
    process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID = "111";
    try {
      const req = signedRequest({
        event_type: "transaction.completed",
        event_id: "evt_other",
        data: {
          id: "txn_other",
          customer_id: "ctm_other",
          customer: { email_address: "other@example.com" },
          status: "completed",
          currency_code: "USD",
          details: { totals: { total: "1000" } },
          items: [{ price: { id: "pri_other", product_id: "pro_other" } }]
        }
      });

      const res = await POST(req);

      expect(res.status).toBe(200);
      // 외부 상품이므로 ReviewBoost entitlement/실패 기록은 일절 건드리지 않는다.
      expect(mocks.upsertSubscription).not.toHaveBeenCalled();
      expect(mocks.upsertPendingSubscription).not.toHaveBeenCalled();
      expect(mocks.upsertProfileCustomer).not.toHaveBeenCalled();
      expect(mocks.recordFunnelEvent).not.toHaveBeenCalled();
      // 그래도 결제 알림은 발송된다.
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.telegram.org/botnotifybot/sendMessage",
        expect.objectContaining({ method: "POST" })
      );
      const body = JSON.parse(String((fetchSpy.mock.calls[0][1] as RequestInit).body));
      expect(body.text).toContain("기타 상품(pro_other)");
      expect(body.text).toContain("US$10.00");
    } finally {
      delete process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN;
      delete process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID;
      fetchSpy.mockRestore();
    }
  });
});
