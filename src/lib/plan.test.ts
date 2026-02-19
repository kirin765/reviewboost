import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePlanTierByBilling: vi.fn()
}));

vi.mock("@/lib/billing", () => ({
  resolvePlanTierByBilling: mocks.resolvePlanTierByBilling
}));

import { resolvePlanTierForUser } from "@/lib/plan";

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
