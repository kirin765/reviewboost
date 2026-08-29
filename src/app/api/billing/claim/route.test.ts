import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  claimPendingSubscriptionByEmail: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser
}));

vi.mock("@/lib/billing", () => ({
  claimPendingSubscriptionByEmail: mocks.claimPendingSubscriptionByEmail
}));

import { POST } from "./route";

describe("POST /api/billing/claim", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-1" });
    mocks.currentUser.mockResolvedValue({ emailAddresses: [{ emailAddress: "guest@example.com" }] });
    mocks.claimPendingSubscriptionByEmail.mockResolvedValue(1);
  });

  it("claims pending subscriptions for the logged-in user's email", async () => {
    const res = await POST(
      new Request("https://reviewboost.app/api/billing/claim", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ claimed: 1 });
    expect(mocks.claimPendingSubscriptionByEmail).toHaveBeenCalledWith("user-1", "guest@example.com");
  });

  it("returns 401 without a session", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    const res = await POST(
      new Request("https://reviewboost.app/api/billing/claim", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );
    expect(res.status).toBe(401);
    expect(mocks.claimPendingSubscriptionByEmail).not.toHaveBeenCalled();
  });

  it("returns claimed 0 when the user has no email", async () => {
    mocks.currentUser.mockResolvedValue({ emailAddresses: [] });
    const res = await POST(
      new Request("https://reviewboost.app/api/billing/claim", {
        method: "POST",
        headers: { origin: "https://reviewboost.app" }
      })
    );
    await expect(res.json()).resolves.toEqual({ claimed: 0 });
  });
});
