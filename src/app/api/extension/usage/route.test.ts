import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, OPTIONS, POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  verifyExtensionToken: vi.fn(),
  resolveExtensionTier: vi.fn(),
  consumeExtensionQuota: vi.fn(),
  getExtensionUsageCount: vi.fn(),
  recordFunnelEvent: vi.fn(),
  logApiError: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/extension_token", () => ({ verifyExtensionToken: mocks.verifyExtensionToken }));
vi.mock("@/lib/extension_plan", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/extension_plan")>();
  return { ...actual, resolveExtensionTier: mocks.resolveExtensionTier };
});
vi.mock("@/lib/db/queries", () => ({
  consumeExtensionQuota: mocks.consumeExtensionQuota,
  getExtensionUsageCount: mocks.getExtensionUsageCount,
  recordFunnelEvent: mocks.recordFunnelEvent
}));
vi.mock("@/lib/api_log", () => ({ logApiError: mocks.logApiError }));

const EXT_ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

function usageRequest(init?: { method?: string; token?: string; body?: unknown }): Request {
  const headers: Record<string, string> = { origin: EXT_ORIGIN };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  if (init?.body !== undefined) headers["content-type"] = "application/json";
  return new Request("https://reviewboost.co.kr/api/extension/usage", {
    method: init?.method ?? "GET",
    headers,
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {})
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: null });
  mocks.verifyExtensionToken.mockReturnValue(null);
});

describe("OPTIONS /api/extension/usage", () => {
  it("echoes the extension origin", async () => {
    const res = await OPTIONS(usageRequest({ method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
    expect(res.headers.get("access-control-allow-headers")).toContain("authorization");
  });
});

describe("GET /api/extension/usage", () => {
  it("returns anonymous status without a token", async () => {
    const res = await GET(usageRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ authenticated: false, tier: "anonymous", limit: 50 });
  });

  it("falls back to the Clerk session when no bearer token is present", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_web" });
    mocks.resolveExtensionTier.mockResolvedValue("free");
    mocks.getExtensionUsageCount.mockResolvedValue(5);

    const res = await GET(usageRequest());
    const body = await res.json();
    expect(body).toMatchObject({ authenticated: true, tier: "free", limit: 50, used: 5, remaining: 45 });
  });

  it("returns unlimited usage for a paid (extension plan) user", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    mocks.resolveExtensionTier.mockResolvedValue("paid");
    mocks.getExtensionUsageCount.mockResolvedValue(120);

    const res = await GET(usageRequest({ token: "tok" }));
    const body = await res.json();
    expect(body).toMatchObject({ authenticated: true, tier: "paid", limit: null, used: null, remaining: null });
    expect(mocks.getExtensionUsageCount).not.toHaveBeenCalled();
  });
});

describe("POST /api/extension/usage", () => {
  it("requires a valid extension token", async () => {
    const res = await POST(usageRequest({ method: "POST", body: { count: 10 } }));
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("EXTENSION_AUTH_REQUIRED");
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
  });

  it("consumes quota atomically for the resolved tier", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    mocks.resolveExtensionTier.mockResolvedValue("free");
    mocks.consumeExtensionQuota.mockResolvedValue({ ok: true, used: 30 });

    const res = await POST(usageRequest({ method: "POST", token: "tok", body: { count: 30 } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, tier: "free", limit: 50, used: 30, remaining: 20 });

    const args = mocks.consumeExtensionQuota.mock.calls[0][0];
    expect(args).toMatchObject({ userId: "user_1", count: 30, dailyLimit: 50 });
  });

  it("returns 429 when over the daily limit", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    mocks.resolveExtensionTier.mockResolvedValue("free");
    mocks.consumeExtensionQuota.mockResolvedValue({ ok: false, reason: "over_limit" });

    const res = await POST(usageRequest({ method: "POST", token: "tok", body: { count: 40 } }));
    expect(res.status).toBe(429);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("EXTENSION_DAILY_LIMIT_EXCEEDED");
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith(
      "extension_limit_hit",
      "user_1",
      expect.objectContaining({ source: "server", tier: "free", count: 40 })
    );
  });

  it("records successful authenticated usage posts", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    mocks.resolveExtensionTier.mockResolvedValue("free");
    mocks.consumeExtensionQuota.mockResolvedValue({ ok: true, used: 30 });

    const res = await POST(usageRequest({ method: "POST", token: "tok", body: { count: 30 } }));
    expect(res.status).toBe(200);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith("extension_usage_post_success", "user_1", {
      source: "usage_post",
      tier: "free",
      day: expect.any(String),
      count: 30,
      used: 30
    });
  });

  it("rejects an invalid count", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    for (const count of [0, -1, 99999, "abc"]) {
      const res = await POST(usageRequest({ method: "POST", token: "tok", body: { count } }));
      expect(res.status).toBe(400);
    }
  });

  it("fails closed (503) on a DB error", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    mocks.resolveExtensionTier.mockResolvedValue("free");
    mocks.consumeExtensionQuota.mockRejectedValue(new Error("db down"));

    const res = await POST(usageRequest({ method: "POST", token: "tok", body: { count: 10 } }));
    expect(res.status).toBe(503);
    expect(mocks.logApiError).toHaveBeenCalledWith(expect.objectContaining({ code: "QUOTA_CHECK_UNAVAILABLE", status: 503 }));
  });

  it("allows unmetered collection when storage is off", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    mocks.resolveExtensionTier.mockResolvedValue("free");
    mocks.consumeExtensionQuota.mockResolvedValue({ ok: false, reason: "storage_off" });

    const res = await POST(usageRequest({ method: "POST", token: "tok", body: { count: 10 } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true });
  });

  it("skips quota consumption for paid users (unlimited)", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    mocks.resolveExtensionTier.mockResolvedValue("paid");

    const res = await POST(usageRequest({ method: "POST", token: "tok", body: { count: 5000 } }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, tier: "paid", limit: null, used: null, remaining: null });
    expect(mocks.consumeExtensionQuota).not.toHaveBeenCalled();
  });
});
