import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  isPaddleConfigured: vi.fn(),
  paddlePriceIdForPlan: vi.fn(),
  appBaseUrl: vi.fn(),
  paddleRequest: vi.fn(),
  findPaddleCustomerIdByUserId: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerActionClient: () => ({
    auth: {
      getUser: mocks.getUser
    }
  })
}));

vi.mock("@/lib/paddle", () => ({
  isPaddleConfigured: mocks.isPaddleConfigured,
  paddlePriceIdForPlan: mocks.paddlePriceIdForPlan,
  appBaseUrl: mocks.appBaseUrl,
  paddleRequest: mocks.paddleRequest
}));

vi.mock("@/lib/billing", () => ({
  findPaddleCustomerIdByUserId: mocks.findPaddleCustomerIdByUserId
}));

import { POST } from "./route";

describe("POST /api/billing/checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1", email: "user@example.com" } } });
    mocks.isPaddleConfigured.mockReturnValue(true);
    mocks.paddlePriceIdForPlan.mockReturnValue("pri_123");
    mocks.appBaseUrl.mockReturnValue("https://reviewboost.app");
    mocks.findPaddleCustomerIdByUserId.mockResolvedValue("ctm_123");
    mocks.paddleRequest.mockResolvedValue({
      checkout: {
        url: "https://checkout.paddle.com/c/test"
      }
    });
  });

  it("returns 401 when user is not authenticated", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(new Request("https://reviewboost.app/api/billing/checkout", { method: "POST" }));

    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({ error: "로그인이 필요합니다." });
    expect(mocks.isPaddleConfigured).not.toHaveBeenCalled();
  });

  it("returns 503 when paddle configuration is incomplete", async () => {
    mocks.isPaddleConfigured.mockReturnValue(false);

    const res = await POST(new Request("https://reviewboost.app/api/billing/checkout", { method: "POST" }));

    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body).toMatchObject({
      error: "결제 설정이 아직 완료되지 않았습니다.",
      code: "paddle_not_configured",
      debug: {
        env: "test",
        baseUrl: "unknown",
        paddleEnv: "unknown",
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
      headers: { "content-type": "application/json" }
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
        paddleEnv: "unknown",
        plan: "basic",
        priceId: ""
      }
    });
  });

  it("creates checkout with known paddle customer id when available", async () => {
    const req = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({ plan: "pro" }),
      headers: { "content-type": "application/json" }
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

  it("creates checkout without customer fields when customer id is absent", async () => {
    mocks.findPaddleCustomerIdByUserId.mockResolvedValue(null);

    const req = new Request("https://reviewboost.app/api/billing/checkout", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" }
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
