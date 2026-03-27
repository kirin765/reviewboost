import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  applySecurityHeaders: vi.fn(),
  normalizeCookieOptions: vi.fn((options: Record<string, unknown>) => options)
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      verifyOtp: mocks.verifyOtp
    }
  })
}));

vi.mock("@/lib/supabase/keys", () => ({
  getSupabaseUrl: () => "https://project.supabase.co",
  getSupabaseAnonKey: () => "anon-key"
}));

vi.mock("@/lib/security", () => ({
  applySecurityHeaders: mocks.applySecurityHeaders,
  normalizeCookieOptions: mocks.normalizeCookieOptions
}));

import { GET } from "./route";

function createRequest(url: string) {
  return {
    url,
    headers: new Headers({
      host: "reviewboost.co.kr",
      "x-forwarded-proto": "https"
    }),
    cookies: {
      getAll: () => [],
      set: vi.fn()
    }
  };
}

describe("GET /auth/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.verifyOtp.mockResolvedValue({ error: null });
  });

  it("redirects recovery confirmations to the reset-password page", async () => {
    const response = await GET(
      createRequest("https://reviewboost.co.kr/auth/confirm?token_hash=token-1&type=recovery&next=%2Fdashboard") as any
    );

    expect(mocks.verifyOtp).toHaveBeenCalledWith({
      type: "recovery",
      token_hash: "token-1"
    });
    expect(response.headers.get("location")).toBe("https://reviewboost.co.kr/reset-password?next=%2Fdashboard");
    expect(mocks.applySecurityHeaders).toHaveBeenCalledOnce();
  });
});
