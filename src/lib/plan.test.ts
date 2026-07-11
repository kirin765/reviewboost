import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePlanTierByBilling: vi.fn()
}));

vi.mock("@/lib/billing", () => ({
  resolvePlanTierByBilling: mocks.resolvePlanTierByBilling
}));

import {
  canUseAdvancedAi,
  monthStartIso,
  monthlyLimitForPlan,
  planLabel,
  resolvePlanTier,
  resolvePlanTierForUser
} from "@/lib/plan";

describe("resolvePlanTierForUser", () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.PLAN_PRO_EMAILS;
    delete process.env.PLAN_BASIC_EMAILS;
  });

  it("sends email-derived fallback plan to billing-backed resolver", async () => {
    process.env.PLAN_PRO_EMAILS = "pro@reviewboost.test";
    mocks.resolvePlanTierByBilling.mockResolvedValueOnce("pro");

    const plan = await resolvePlanTierForUser({
      userId: "user-123",
      email: "pro@reviewboost.test"
    });

    expect(plan).toBe("pro");
    expect(mocks.resolvePlanTierByBilling).toHaveBeenCalledWith({
      userId: "user-123",
      fallbackPlan: "pro"
    });
  });

  it("defaults fallback to free when email is unknown", async () => {
    mocks.resolvePlanTierByBilling.mockResolvedValueOnce("free");

    const plan = await resolvePlanTierForUser({
      userId: "user-456",
      email: "unknown@reviewboost.test"
    });

    expect(plan).toBe("free");
    expect(mocks.resolvePlanTierByBilling).toHaveBeenCalledWith({
      userId: "user-456",
      fallbackPlan: "free"
    });
  });
});

describe("resolvePlanTier (email overrides)", () => {
  afterEach(() => {
    delete process.env.PLAN_PRO_EMAILS;
    delete process.env.PLAN_BASIC_EMAILS;
  });

  it("matches pro and basic override lists case-insensitively", () => {
    process.env.PLAN_PRO_EMAILS = "Pro@Reviewboost.test";
    process.env.PLAN_BASIC_EMAILS = "basic@reviewboost.test";
    expect(resolvePlanTier("pro@reviewboost.test")).toBe("pro");
    expect(resolvePlanTier("basic@reviewboost.test")).toBe("basic");
    expect(resolvePlanTier("someone@else.test")).toBe("free");
    expect(resolvePlanTier(null)).toBe("free");
  });
});

describe("plan gate helpers", () => {
  it("returns the monthly limit for each tier", () => {
    expect(monthlyLimitForPlan("free")).toBe(5);
    expect(monthlyLimitForPlan("basic")).toBe(200);
    expect(monthlyLimitForPlan("pro")).toBe(1000);
  });

  it("allows advanced AI only for paid tiers", () => {
    expect(canUseAdvancedAi("free")).toBe(false);
    expect(canUseAdvancedAi("basic")).toBe(true);
    expect(canUseAdvancedAi("pro")).toBe(true);
  });

  it("labels each plan tier", () => {
    expect(planLabel("free")).toBe("Free");
    expect(planLabel("basic")).toBe("Basic");
    expect(planLabel("pro")).toBe("Pro");
  });

  it("returns the UTC month start as ISO", () => {
    expect(monthStartIso(new Date("2026-07-11T09:30:00.000Z"))).toBe("2026-07-01T00:00:00.000Z");
  });
});
