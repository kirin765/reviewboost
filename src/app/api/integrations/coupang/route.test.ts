import { describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
  createSupabaseServerActionClient: vi.fn(),
  getCoupangCredentialSummary: vi.fn(),
  upsertCoupangCredentials: vi.fn(),
  logApiError: vi.fn()
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerActionClient: mocks.createSupabaseServerActionClient
}));

vi.mock("@/lib/coupang_credentials", () => ({
  getCoupangCredentialSummary: mocks.getCoupangCredentialSummary,
  upsertCoupangCredentials: mocks.upsertCoupangCredentials
}));

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

describe("/api/integrations/coupang", () => {
  it("returns summary for authenticated user", async () => {
    mocks.createSupabaseServerActionClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) }
    });
    mocks.getCoupangCredentialSummary.mockResolvedValueOnce({
      configured: true,
      vendorId: "A00012345",
      market: "KR",
      accessKeyHint: "...1234",
      updatedAt: null
    });

    const res = await GET(new Request("https://reviewboost.app/api/integrations/coupang"));
    const body = (await res.json()) as { configured: boolean; vendorId: string };

    expect(res.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.vendorId).toBe("A00012345");
  });

  it("stores credentials for authenticated user", async () => {
    mocks.createSupabaseServerActionClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) }
    });
    mocks.upsertCoupangCredentials.mockResolvedValueOnce(undefined);
    mocks.getCoupangCredentialSummary.mockResolvedValueOnce({
      configured: true,
      vendorId: "A00012345",
      market: "KR",
      accessKeyHint: "...1234",
      updatedAt: "2026-04-05T00:00:00.000Z"
    });

    const res = await POST(new Request("https://reviewboost.app/api/integrations/coupang", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ vendorId: "A00012345", accessKey: "access", secretKey: "secret", market: "KR" })
    }));
    const body = (await res.json()) as { configured: boolean };

    expect(res.status).toBe(200);
    expect(body.configured).toBe(true);
    expect(mocks.upsertCoupangCredentials).toHaveBeenCalledWith("user-1", {
      vendorId: "A00012345",
      accessKey: "access",
      secretKey: "secret",
      market: "KR"
    });
  });
});
