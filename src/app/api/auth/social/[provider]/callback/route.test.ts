import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  decodeSocialState: vi.fn(),
  exchangeSocialCode: vi.fn(),
  fetchSocialProfile: vi.fn(),
  resolveSocialEmail: vi.fn(),
  socialRedirectUrl: vi.fn(),
  appBaseUrl: vi.fn(),
  clerkClient: vi.fn()
}));

vi.mock("@/lib/social_auth", () => ({
  decodeSocialState: mocks.decodeSocialState,
  exchangeSocialCode: mocks.exchangeSocialCode,
  fetchSocialProfile: mocks.fetchSocialProfile,
  resolveSocialEmail: mocks.resolveSocialEmail,
  socialRedirectUrl: mocks.socialRedirectUrl,
  SOCIAL_STATE_COOKIE: "rb_social_state"
}));

vi.mock("@/lib/paddle", () => ({
  appBaseUrl: mocks.appBaseUrl
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: mocks.clerkClient
}));

import { GET } from "./route";

function makeUrl(path: string): URL {
  return new URL(`https://reviewboost.app${path}`);
}

function buildRequest(url: URL, stateCookie?: string) {
  return new NextRequest(url, {
    headers: stateCookie ? { cookie: `rb_social_state=${stateCookie}` } : {}
  });
}

describe("GET /api/auth/social/[provider]/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.appBaseUrl.mockReturnValue("https://reviewboost.app");
    mocks.socialRedirectUrl.mockReturnValue("https://reviewboost.app/api/auth/social/naver/callback");
    mocks.decodeSocialState.mockReturnValue({ state: "expected-state", next: "/extension-connect?ext=abc", exp: Date.now() + 60_000 });
    mocks.exchangeSocialCode.mockResolvedValue("access-token");
    mocks.fetchSocialProfile.mockResolvedValue({
      provider: "naver",
      id: "n1",
      email: "user@example.com",
      name: "김네이버"
    });
    mocks.resolveSocialEmail.mockReturnValue("user@example.com");
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn().mockResolvedValue({ data: [] }),
        createUser: vi.fn().mockResolvedValue({ id: "user_created" })
      },
      signInTokens: {
        createSignInToken: vi.fn().mockResolvedValue({ token: "signin-token-jwt" })
      }
    });
  });

  it("reissues a sign-in token and redirects to /login with __clerk_ticket (prod sign-in token flow)", async () => {
    const url = makeUrl("/api/auth/social/naver/callback?code=c1&state=expected-state");
    const res = await GET(buildRequest(url, "enc-state"), { params: Promise.resolve({ provider: "naver" }) });

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("/login");
    expect(location).toContain("__clerk_ticket=signin-token-jwt");
    expect(location).toContain(encodeURIComponent("https://reviewboost.app/extension-connect?ext=abc"));
    // state 쿠키 삭제 set-cookie는 있되, __session 세션 쿠키를 직접 설정하지 않는다 (위젯이 교환).
    expect(res.headers.get("set-cookie") ?? "").not.toContain("__session=");

    const client = await mocks.clerkClient.mock.results[0].value;
    expect(client.users.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ emailAddress: ["user@example.com"], firstName: "김네이버" })
    );
    expect(client.signInTokens.createSignInToken).toHaveBeenCalledWith({
      userId: "user_created",
      expiresInSeconds: 600
    });
    expect(client.sessions?.createSession).not.toBeDefined();
  });

  it("reuses an existing Clerk user by email instead of creating a duplicate", async () => {
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUserList: vi.fn().mockResolvedValue({ data: [{ id: "user_existing" }] }),
        createUser: vi.fn()
      },
      signInTokens: {
        createSignInToken: vi.fn().mockResolvedValue({ token: "signin-token-jwt-2" })
      }
    });

    const url = makeUrl("/api/auth/social/naver/callback?code=c1&state=expected-state");
    const res = await GET(buildRequest(url, "enc-state"), { params: Promise.resolve({ provider: "naver" }) });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("__clerk_ticket=signin-token-jwt-2");
    const client = await mocks.clerkClient.mock.results[0].value;
    expect(client.users.createUser).not.toHaveBeenCalled();
    expect(client.signInTokens.createSignInToken).toHaveBeenCalledWith({
      userId: "user_existing",
      expiresInSeconds: 600
    });
  });

  it("redirects to /dashboard landing when next is the default /login", async () => {
    mocks.decodeSocialState.mockReturnValue({ state: "expected-state", next: "/login", exp: Date.now() + 60_000 });
    const url = makeUrl("/api/auth/social/naver/callback?code=c1&state=expected-state");
    const res = await GET(buildRequest(url, "enc-state"), { params: Promise.resolve({ provider: "naver" }) });

    expect(res.status).toBe(307);
    const location = res.headers.get("location") ?? "";
    expect(location).toContain("__clerk_ticket=signin-token-jwt");
    expect(location).toContain(encodeURIComponent("https://reviewboost.app/dashboard"));
  });

  it("redirects to login when the state cookie does not match", async () => {
    const url = makeUrl("/api/auth/social/naver/callback?code=c1&state=wrong-state");
    const res = await GET(buildRequest(url, "enc-state"), { params: Promise.resolve({ provider: "naver" }) });

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("location")).toContain("social_state_mismatch");
    expect(mocks.exchangeSocialCode).not.toHaveBeenCalled();
  });

  it("redirects to login for unknown providers", async () => {
    const url = makeUrl("/api/auth/social/facebook/callback");
    const res = await GET(buildRequest(url), { params: Promise.resolve({ provider: "facebook" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });
});
