import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  isPaddleConfigured: vi.fn(),
  paddlePriceIdForPlan: vi.fn(),
  paddleEnv: vi.fn(),
  appBaseUrl: vi.fn(),
  paddleRequest: vi.fn(),
  findPaddleCustomerIdByUserId: vi.fn(),
  recordFunnelEvent: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser
}));

vi.mock("@/lib/paddle", () => ({
  isPaddleConfigured: mocks.isPaddleConfigured,
  paddlePriceIdForPlan: mocks.paddlePriceIdForPlan,
  paddleEnv: mocks.paddleEnv,
  appBaseUrl: mocks.appBaseUrl,
  paddleRequest: mocks.paddleRequest
}));

vi.mock("@/lib/billing", () => ({
  findPaddleCustomerIdByUserId: mocks.findPaddleCustomerIdByUserId
}));

vi.mock("@/lib/db/queries", () => ({
  recordFunnelEvent: mocks.recordFunnelEvent
}));

import { POST } from "./route";

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.currentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: "user@example.com" }] });
    mocks.isPaddleConfigured.mockReturnValue(true);
    mocks.paddlePriceIdForPlan.mockReturnValue("pri_123");
    mocks.paddleEnv.mockReturnValue("sandbox");
    mocks.appBaseUrl.mockReturnValue("https://reviewboost.app");
    mocks.findPaddleCustomerIdByUserId.mockResolvedValue("ctm_123");
    mocks.paddleRequest.mockResolvedValue({
      checkout: {
        url: "https://checkout.paddle.com/c/test"
      }
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    mocks.currentUser.mockResolvedValue(null);

    const res = await POST(new Request("https://reviewboost.app/api/billing/checkout", { method: "POST", headers: { origin: "https://reviewboost.app" } }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toMatchObject({ error: "로그인이 필요합니다.", code: "checkout_error" });
    expect(mocks.isPaddleConfigured).not.toHaveBeenCalled();
  });

  it("returns 503 when paddle configuration is incomplete", async () => {
    mocks.isPaddleConfigured.mockReturnValue(false);

    const res = await POST(new Request("https://reviewboost.app/api/billing/checkout", { method: "POST", headers: { origin: "https://reviewboost.app" } }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({
      error: "결제 설정이 아직 완료되지 않았습니다.",
      code: "paddle_not_configured",
      debug: {
        env: "test",
        baseUrl: "unknown",
        paddleEnv: "sandbox",
        plan: "basic",
        priceId: ""
      }
    });
  });

  it("returns 500 when selected plan has no mapped price id", async () => {
    mocks.paddlePriceIdForPlan.mockImplementation(() => {
      throw new Error("PADDLE_PRO_PRICE_ID missing");
    });

    const req = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    });

    const res = await POST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toMatchObject({
      error: "요금제 가격 ID가 설정되지 않았습니다.",
      code: "missing_price_id",
      debug: {
        env: "test",
        baseUrl: "unknown",
        paddleEnv: "sandbox",
        plan: "pro",
        priceId: ""
      }
    });
  });

  it("creates checkout with known paddle customer id when available", async () => {
    const req = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ url: "https://checkout.paddle.com/c/test" });
    expect(mocks.paddlePriceIdForPlan).toHaveBeenCalledWith("pro");
    expect(mocks.findPaddleCustomerIdByUserId).toHaveBeenCalledWith("user-1");
    expect(mocks.paddleRequest).toHaveBeenCalledWith("/transactions", {
      method: "POST",
      body: {
        items: [{ price_id: "pri_123", quantity: 1 }],
        custom_data: {
          user_id: "user-1",
          plan_tier: "pro"
        },
        checkout: {
          url: "https://reviewboost.app/pricing?billing=success&plan=pro"
        },
        collection_mode: "automatic",
        customer_id: "ctm_123"
      }
    });
  });

  it("returns 503 extension_price_not_configured when the extension price id is missing", async () => {
    mocks.paddlePriceIdForPlan.mockImplementation(() => {
      throw new Error("PADDLE_EXTENSION_PRICE_ID is not set for plan 'extension'");
    });

    const req = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "extension" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    });

    const res = await POST(req);

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({ code: "extension_price_not_configured" });
  });

  it("records the extension_checkout_started funnel event for the extension plan only", async () => {
    const extReq = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "extension" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    });

    const extRes = await POST(extReq);
    expect(extRes.status).toBe(200);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith("extension_checkout_started", "user-1");

    mocks.recordFunnelEvent.mockClear();
    const basicReq = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "basic" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    });

    const basicRes = await POST(basicReq);
    expect(basicRes.status).toBe(200);
    expect(mocks.recordFunnelEvent).not.toHaveBeenCalled();
  });

  it("records extension_checkout_started only after a checkout URL was created", async () => {
    const order: string[] = [];
    mocks.paddleRequest.mockImplementation(async () => {
      order.push("paddleRequest");
      return { checkout: { url: "https://checkout.paddle.com/c/test" } };
    });
    mocks.recordFunnelEvent.mockImplementation(async () => {
      order.push("recordFunnelEvent");
    });

    const res = await POST(new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "extension" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    }));

    expect(res.status).toBe(200);
    expect(order).toEqual(["paddleRequest", "recordFunnelEvent"]);
  });

  it("does not record extension_checkout_started when the price id is missing (503)", async () => {
    mocks.paddlePriceIdForPlan.mockImplementation(() => {
      throw new Error("PADDLE_EXTENSION_PRICE_ID is not set for plan 'extension'");
    });

    const res = await POST(new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "extension" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    }));

    expect(res.status).toBe(503);
    expect(mocks.recordFunnelEvent).not.toHaveBeenCalled();
  });

  it("does not record extension_checkout_started when checkout creation fails", async () => {
    mocks.paddleRequest.mockRejectedValue(new Error("paddle down"));

    const res = await POST(new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "extension" }),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    }));

    expect(res.status).toBe(500);
    expect(mocks.recordFunnelEvent).not.toHaveBeenCalled();
  });

  it("creates checkout without customer fields when customer id is absent", async () => {
    mocks.findPaddleCustomerIdByUserId.mockResolvedValue(null);

    const req = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json", origin: "https://reviewboost.app" }
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mocks.paddlePriceIdForPlan).toHaveBeenCalledWith("basic");
    expect(mocks.paddleRequest).toHaveBeenCalledWith("/transactions", {
      method: "POST",
      body: {
        items: [{ price_id: "pri_123", quantity: 1 }],
        custom_data: {
          user_id: "user-1",
          plan_tier: "basic"
        },
        checkout: {
          url: "https://reviewboost.app/pricing?billing=success&plan=basic"
        },
        collection_mode: "automatic"
      }
    });
  });
});
