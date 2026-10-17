import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), tier: vi.fn(), save: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/extension_plan", () => ({ resolveExtensionTier: mocks.tier }));
vi.mock("@/lib/db/queries", () => ({ recordFunnelEventOnce: mocks.save }));
import { POST } from "./route";

function request(body: unknown = { task: "weekly_review", source: "naver" }, origin = "https://reviewboost.co.kr") {
  return new Request("https://reviewboost.co.kr/api/extension/survey", {
    method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body)
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "customer-1" });
  mocks.tier.mockResolvedValue("paid");
  mocks.save.mockResolvedValue(true);
});
describe("optional paid customer survey", () => {
  it("rejects cross-origin requests, anonymous users, and free users", async () => {
    expect((await POST(request({}, "https://foreign.example"))).status).toBe(403);
    mocks.auth.mockResolvedValue({ userId: null });
    expect((await POST(request())).status).toBe(401);
    mocks.auth.mockResolvedValue({ userId: "customer-1" });
    mocks.tier.mockResolvedValue("free");
    expect((await POST(request())).status).toBe(403);
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("accepts either answer alone and binds attribution to the signed-in user", async () => {
    expect((await POST(request({ source: "naver", userId: "forged", email: "ignored" }))).status).toBe(200);
    expect(mocks.save).toHaveBeenCalledWith("extension_customer_survey", "customer-1",
      { task: null, source: "naver", version: 1 }, "extension_survey:v1:customer-1");
  });
  it("rejects empty answers and arbitrary text", async () => {
    for (const body of [{}, { task: "user@example.com" }, { source: "__proto__" }, [], null]) {
      expect((await POST(request(body))).status).toBe(400);
    }
    expect(mocks.save).not.toHaveBeenCalled();
  });
  it("acknowledges retries but reports persistence failures", async () => {
    mocks.save.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(200);
    mocks.save.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(503);
  });
});
