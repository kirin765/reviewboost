import { beforeEach, describe, expect, it, vi } from "vitest";
import { OPTIONS, POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  verifyExtensionToken: vi.fn(),
  recordFunnelEvent: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/extension_token", () => ({ verifyExtensionToken: mocks.verifyExtensionToken }));
vi.mock("@/lib/db/queries", () => ({ recordFunnelEvent: mocks.recordFunnelEvent }));

const EXT_ORIGIN = "chrome-extension://abcdefghijklmnopabcdefghijklmnop";

function eventRequest(init?: { method?: string; token?: string; body?: unknown; rawBody?: string }): Request {
  const headers: Record<string, string> = { origin: EXT_ORIGIN };
  if (init?.token) headers.authorization = `Bearer ${init.token}`;
  const body = init?.rawBody ?? (init?.body !== undefined ? JSON.stringify(init.body) : undefined);
  if (body !== undefined) headers["content-type"] = "application/json";
  return new Request("https://reviewboost.co.kr/api/extension/event", {
    method: init?.method ?? "POST",
    headers,
    ...(body !== undefined ? { body } : {})
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: null });
  mocks.verifyExtensionToken.mockReturnValue(null);
  mocks.recordFunnelEvent.mockResolvedValue(undefined);
});

describe("OPTIONS /api/extension/event", () => {
  it("echoes the extension origin", async () => {
    const res = await OPTIONS(eventRequest({ method: "OPTIONS" }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
    expect(res.headers.get("access-control-allow-headers")).toContain("authorization");
  });

  it("does not echo a non-extension origin", async () => {
    const res = await OPTIONS(new Request("https://reviewboost.co.kr/api/extension/event", {
      method: "OPTIONS",
      headers: { origin: "https://evil.example" }
    }));
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("POST /api/extension/event", () => {
  it("records an anonymous limit_hit with popup source and returns 204", async () => {
    const res = await POST(eventRequest({ body: { name: "limit_hit" } }));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith("extension_limit_hit", null, { source: "popup" });
  });

  it("resolves the user from a bearer extension token", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    const res = await POST(eventRequest({ token: "tok", body: { name: "limit_hit" } }));
    expect(res.status).toBe(204);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith("extension_limit_hit", "user_1", { source: "popup" });
  });

  it("falls back to the Clerk session when no bearer token is present", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_web" });
    const res = await POST(eventRequest({ body: { name: "limit_hit" } }));
    expect(res.status).toBe(204);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith("extension_limit_hit", "user_web", { source: "popup" });
  });

  it("rejects any other event name with 400", async () => {
    for (const name of ["checkout_started", "", 1, null, undefined]) {
      const res = await POST(eventRequest({ body: { name } }));
      expect(res.status).toBe(400);
    }
    expect(mocks.recordFunnelEvent).not.toHaveBeenCalled();
  });

  it("records usage telemetry events", async () => {
    mocks.verifyExtensionToken.mockReturnValue({ userId: "user_1" });
    const res = await POST(eventRequest({ token: "tok", body: { name: "usage_post_401" } }));
    expect(res.status).toBe(204);
    expect(mocks.recordFunnelEvent).toHaveBeenCalledWith("extension_usage_post_401", "user_1", { source: "usage_post" });
  });

  it("rejects a non-JSON body with 400 and CORS headers", async () => {
    const res = await POST(eventRequest({ rawBody: "not json" }));
    expect(res.status).toBe(400);
    expect(res.headers.get("access-control-allow-origin")).toBe(EXT_ORIGIN);
  });
});
