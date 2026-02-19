import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getSupabaseAdminClient: vi.fn()
}));

vi.mock("@/lib/supabase_server", () => ({
  getSupabaseAdminClient: mocks.getSupabaseAdminClient
}));

import { canUseAdvancedAi } from "@/lib/plan";
import { resolvePlanTierByBilling } from "@/lib/billing";

function createAdminWithSubscriptions(rows: Array<Record<string, unknown>>) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(async () => ({ data: rows }))
  };

  return {
    from: vi.fn(() => chain)
  };
}

describe("resolvePlanTierByBilling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns fallback plan when userId is missing", async () => {
    const plan = await resolvePlanTierByBilling({ userId: null, fallbackPlan: "free" });
    expect(plan).toBe("free");
    expect(mocks.getSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it("returns fallback plan when billing storage is unavailable", async () => {
    mocks.getSupabaseAdminClient.mockReturnValueOnce(null);

    const plan = await resolvePlanTierByBilling({ userId: "user-1", fallbackPlan: "basic" });
    expect(plan).toBe("basic");
  });

  it("returns paid tier for active-equivalent statuses", async () => {
    const admin = createAdminWithSubscriptions([
      { status: "canceled", plan_tier: "pro", current_period_end: "2026-02-01T00:00:00.000Z" },
      { status: "active", plan_tier: "pro", current_period_end: "2026-01-01T00:00:00.000Z" }
    ]);
    mocks.getSupabaseAdminClient.mockReturnValueOnce(admin);

    const plan = await resolvePlanTierByBilling({ userId: "user-1", fallbackPlan: "free" });
    expect(plan).toBe("pro");
  });

  it("ignores canceled and paused paid subscriptions", async () => {
    const admin = createAdminWithSubscriptions([
      { status: "paused", plan_tier: "pro", current_period_end: "2026-02-01T00:00:00.000Z" },
      { status: "canceled", plan_tier: "basic", current_period_end: "2026-01-01T00:00:00.000Z" }
    ]);
    mocks.getSupabaseAdminClient.mockReturnValueOnce(admin);

    const plan = await resolvePlanTierByBilling({ userId: "user-1", fallbackPlan: "free" });
    expect(plan).toBe("free");
    expect(canUseAdvancedAi(plan)).toBe(false);
  });

  it("falls back safely if billing query throws", async () => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      order: vi.fn(() => chain),
      limit: vi.fn(async () => {
        throw new Error("db down");
      })
    };
    const admin = {
      from: vi.fn(() => chain)
    };
    mocks.getSupabaseAdminClient.mockReturnValueOnce(admin);

    const plan = await resolvePlanTierByBilling({ userId: "user-1", fallbackPlan: "basic" });
    expect(plan).toBe("basic");
  });
});
