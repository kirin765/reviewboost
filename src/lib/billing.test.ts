import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSupabaseAdminClientMock } = vi.hoisted(() => ({
  getSupabaseAdminClientMock: vi.fn()
}));

vi.mock("@/lib/supabase_server", () => ({
  getSupabaseAdminClient: getSupabaseAdminClientMock
}));

import {
  normalizeBillingTimestamp,
  resolvePlanTierByBilling,
  upsertProfileCustomer,
  upsertSubscription
} from "@/lib/billing";

function createSelectQuery(data: unknown) {
  return {
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data }),
    maybeSingle: vi.fn().mockResolvedValue({ data })
  };
}

describe("billing utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes ISO strings, unix seconds/millis, and invalid timestamps safely", () => {
    expect(normalizeBillingTimestamp("2025-01-01T00:00:00Z")).toBe("2025-01-01T00:00:00.000Z");
    expect(normalizeBillingTimestamp(1735689600)).toBe("2025-01-01T00:00:00.000Z");
    expect(normalizeBillingTimestamp(1735689600000)).toBe("2025-01-01T00:00:00.000Z");
    expect(normalizeBillingTimestamp("1735689600")).toBe("2025-01-01T00:00:00.000Z");
    expect(normalizeBillingTimestamp("not-a-date")).toBeNull();
    expect(normalizeBillingTimestamp(null)).toBeNull();
  });

  it("resolvePlanTierByBilling deterministically picks the latest active paid subscription", async () => {
    const rows = [
      {
        plan_tier: "pro",
        status: "active",
        current_period_end: "invalid-date",
        updated_at: "2025-02-05T00:00:00.000Z",
        paddle_subscription_id: "sub-z"
      },
      {
        plan_tier: "basic",
        status: "canceled",
        current_period_end: "2025-03-01T00:00:00.000Z",
        updated_at: "2025-03-01T00:00:00.000Z",
        paddle_subscription_id: "sub-canceled"
      },
      {
        plan_tier: "basic",
        status: "active",
        current_period_end: "2025-03-01T00:00:00.000Z",
        updated_at: "2025-03-01T00:00:00.000Z",
        paddle_subscription_id: "sub-a"
      },
      {
        plan_tier: "pro",
        status: "trialing",
        current_period_end: "2025-03-01T00:00:00.000Z",
        updated_at: "2025-03-01T00:00:00.000Z",
        paddle_subscription_id: "sub-b"
      }
    ];

    const selectQuery = createSelectQuery(rows);
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(selectQuery)
    });

    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    const plan = await resolvePlanTierByBilling({ userId: "user-1", fallbackPlan: "free" });

    expect(plan).toBe("pro");
    expect(fromMock).toHaveBeenCalledWith("subscriptions");
  });

  it("treats completed status as active entitlement", async () => {
    const rows = [
      {
        plan_tier: "basic",
        status: "completed",
        current_period_end: "2025-03-01T00:00:00.000Z",
        updated_at: "2025-03-01T00:00:00.000Z",
        paddle_subscription_id: "sub-basic-completed"
      }
    ];

    const selectQuery = createSelectQuery(rows);
    const fromMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue(selectQuery)
    });

    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    const plan = await resolvePlanTierByBilling({ userId: "user-2", fallbackPlan: "free" });

    expect(plan).toBe("basic");
    expect(fromMock).toHaveBeenCalledWith("subscriptions");
  });

  it("upsertProfileCustomer performs idempotent upsert keyed by user_id", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const fromMock = vi.fn().mockReturnValue({ upsert });
    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    await upsertProfileCustomer("user-1", "ctm_123");

    expect(fromMock).toHaveBeenCalledWith("profiles");
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, options] = upsert.mock.calls[0];
    expect(payload.user_id).toBe("user-1");
    expect(payload.paddle_customer_id).toBe("ctm_123");
    expect(options).toEqual({ onConflict: "user_id" });
    expect(new Date(payload.updated_at).toISOString()).toBe(payload.updated_at);
  });

  it("upsertSubscription performs idempotent upsert keyed by paddle_subscription_id and normalizes timestamps", async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const fromMock = vi.fn().mockReturnValue({ upsert });
    getSupabaseAdminClientMock.mockReturnValue({ from: fromMock });

    await upsertSubscription({
      userId: "user-1",
      paddleCustomerId: "ctm_123",
      paddleSubscriptionId: "sub_123",
      paddlePriceId: "pri_123",
      status: "active",
      planTier: "basic",
      currentPeriodStart: 1735689600,
      currentPeriodEnd: "bad-date",
      cancelAtPeriodEnd: false
    });

    expect(fromMock).toHaveBeenCalledWith("subscriptions");
    expect(upsert).toHaveBeenCalledTimes(1);
    const [payload, options] = upsert.mock.calls[0];
    expect(payload.current_period_start).toBe("2025-01-01T00:00:00.000Z");
    expect(payload.current_period_end).toBeNull();
    expect(payload.paddle_subscription_id).toBe("sub_123");
    expect(options).toEqual({ onConflict: "paddle_subscription_id" });
  });
});
