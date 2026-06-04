import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn()
}));

vi.mock("@/lib/db", () => ({
  getDb: getDbMock
}));

import {
  normalizeBillingTimestamp,
  resolvePlanTierByBilling,
  upsertProfileCustomer,
  upsertSubscription
} from "@/lib/billing";

// Builds a Drizzle-like select chain: db.select(cols).from(t).where(c).limit(n) -> rows
function makeSelectDb(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ limit });
  const from = vi.fn().mockReturnValue({ where });
  const select = vi.fn().mockReturnValue({ from });
  return { db: { select }, select, from, where, limit };
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
        updated_at: new Date("2025-02-05T00:00:00.000Z"),
        paddle_subscription_id: "sub-z"
      },
      {
        plan_tier: "basic",
        status: "canceled",
        current_period_end: new Date("2025-03-01T00:00:00.000Z"),
        updated_at: new Date("2025-03-01T00:00:00.000Z"),
        paddle_subscription_id: "sub-canceled"
      },
      {
        plan_tier: "basic",
        status: "active",
        current_period_end: new Date("2025-03-01T00:00:00.000Z"),
        updated_at: new Date("2025-03-01T00:00:00.000Z"),
        paddle_subscription_id: "sub-a"
      },
      {
        plan_tier: "pro",
        status: "trialing",
        current_period_end: new Date("2025-03-01T00:00:00.000Z"),
        updated_at: new Date("2025-03-01T00:00:00.000Z"),
        paddle_subscription_id: "sub-b"
      }
    ];

    const { db, select } = makeSelectDb(rows);
    getDbMock.mockReturnValue(db);

    const plan = await resolvePlanTierByBilling({ userId: "user-1", fallbackPlan: "free" });

    expect(plan).toBe("pro");
    expect(select).toHaveBeenCalled();
  });

  it("treats completed status as active entitlement", async () => {
    const rows = [
      {
        plan_tier: "basic",
        status: "completed",
        current_period_end: new Date("2025-03-01T00:00:00.000Z"),
        updated_at: new Date("2025-03-01T00:00:00.000Z"),
        paddle_subscription_id: "sub-basic-completed"
      }
    ];

    const { db } = makeSelectDb(rows);
    getDbMock.mockReturnValue(db);

    const plan = await resolvePlanTierByBilling({ userId: "user-2", fallbackPlan: "free" });

    expect(plan).toBe("basic");
  });

  it("upsertProfileCustomer performs idempotent upsert keyed by userId", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const insert = vi.fn().mockReturnValue({ values });
    getDbMock.mockReturnValue({ insert });

    await upsertProfileCustomer("user-1", "ctm_123");

    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledTimes(1);
    const [payload] = values.mock.calls[0];
    expect(payload.userId).toBe("user-1");
    expect(payload.paddleCustomerId).toBe("ctm_123");
    expect(payload.updatedAt).toBeInstanceOf(Date);

    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    const [conflict] = onConflictDoUpdate.mock.calls[0];
    expect(conflict.set.paddleCustomerId).toBe("ctm_123");
  });

  it("upsertSubscription performs idempotent upsert keyed by paddleSubscriptionId and normalizes timestamps", async () => {
    const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
    const values = vi.fn().mockReturnValue({ onConflictDoUpdate });
    const insert = vi.fn().mockReturnValue({ values });
    getDbMock.mockReturnValue({ insert });

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

    expect(insert).toHaveBeenCalledTimes(1);
    const [payload] = values.mock.calls[0];
    expect(payload.currentPeriodStart).toBeInstanceOf(Date);
    expect(payload.currentPeriodStart.toISOString()).toBe("2025-01-01T00:00:00.000Z");
    expect(payload.currentPeriodEnd).toBeNull();
    expect(payload.paddleSubscriptionId).toBe("sub_123");

    expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
    const [conflict] = onConflictDoUpdate.mock.calls[0];
    expect(conflict.target).toBeDefined();
  });
});
