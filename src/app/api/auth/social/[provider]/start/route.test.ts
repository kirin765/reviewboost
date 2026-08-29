import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appBaseUrl: vi.fn(),
  buildAuthorizeUrl: vi.fn(),
  createSocialState: vi.fn(),
  encodeSocialState: vi.fn(),
  isSocialProviderConfigured: vi.fn(),
  socialRedirectUrl: vi.fn()
}));

vi.mock("@/lib/paddle", () => ({ appBaseUrl: mocks.appBaseUrl }));
vi.mock("@/lib/social_auth", () => ({
  buildAuthorizeUrl: mocks.buildAuthorizeUrl,
  createSocialState: mocks.createSocialState,
  encodeSocialState: mocks.encodeSocialState,
  isSocialProviderConfigured: mocks.isSocialProviderConfigured,
  socialRedirectUrl: mocks.socialRedirectUrl,
  SOCIAL_STATE_COOKIE: "rb_social_state",
  SOCIAL_STATE_TTL_MS: 600_000
}));

import { GET } from "./route";

describe("GET /api/auth/social/[provider]/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appBaseUrl.mockReturnValue("https://reviewboost.app");
    mocks.isSocialProviderConfigured.mockReturnValue(true);
    mocks.createSocialState.mockReturnValue({ state: "s-123", next: "/login", exp: 1_700_000_000_000 });
    mocks.encodeSocialState.mockReturnValue("enc-state");
    mocks.socialRedirectUrl.mockReturnValue("https://reviewboost.app/api/auth/social/naver/callback");
    mocks.buildAuthorizeUrl.mockReturnValue("https://nid.naver.com/oauth2.0/authorize?state=s-123");
  });

  it("redirects to the provider authorize url and sets the state cookie", async () => {
    const req = new NextRequest("https://reviewboost.app/api/auth/social/naver/start?next=%2Fextension-connect%3Fext%3Dabc");
    const res = await GET(req, { params: Promise.resolve({ provider: "naver" }) });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://nid.naver.com/oauth2.0/authorize?state=s-123");
    expect(mocks.createSocialState).toHaveBeenCalledWith("/extension-connect?ext=abc");
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("rb_social_state=enc-state");
    expect(setCookie).toContain("HttpOnly");
  });

  it("redirects to login for unknown providers", async () => {
    const req = new NextRequest("https://reviewboost.app/api/auth/social/facebook/start");
    const res = await GET(req, { params: Promise.resolve({ provider: "facebook" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(mocks.buildAuthorizeUrl).not.toHaveBeenCalled();
  });

  it("redirects to login when the provider is not configured", async () => {
    mocks.isSocialProviderConfigured.mockReturnValue(false);
    const req = new NextRequest("https://reviewboost.app/api/auth/social/kakao/start");
    const res = await GET(req, { params: Promise.resolve({ provider: "kakao" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("social_not_configured");
  });
});
