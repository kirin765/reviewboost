import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAuthorizeUrl,
  createSocialState,
  decodeSocialState,
  encodeSocialState,
  exchangeSocialCode,
  fetchSocialProfile,
  resolveSocialEmail,
  sanitizeNext,
  socialEmailFallback
} from "@/lib/social_auth";

describe("buildAuthorizeUrl", () => {
  beforeEach(() => {
    process.env.NAVER_CLIENT_ID = "naver_client";
    process.env.KAKAO_CLIENT_ID = "kakao_client";
  });
  afterEach(() => {
    delete process.env.NAVER_CLIENT_ID;
    delete process.env.KAKAO_CLIENT_ID;
  });

  it("builds a Naver authorize url with state/redirect/email scope", () => {
    const url = buildAuthorizeUrl("naver", {
      state: "s1",
      redirectUrl: "https://reviewboost.app/api/auth/social/naver/callback"
    });
    expect(url.startsWith("https://nid.naver.com/oauth2.0/authorize?")).toBe(true);
    const q = new URL(url).searchParams;
    expect(q.get("response_type")).toBe("code");
    expect(q.get("client_id")).toBe("naver_client");
    expect(q.get("redirect_uri")).toBe("https://reviewboost.app/api/auth/social/naver/callback");
    expect(q.get("state")).toBe("s1");
    expect(q.get("scope")).toBe("email");
  });

  it("builds a Kakao authorize url", () => {
    const url = buildAuthorizeUrl("kakao", {
      state: "s2",
      redirectUrl: "https://reviewboost.app/api/auth/social/kakao/callback"
    });
    expect(url.startsWith("https://kauth.kakao.com/oauth/authorize?")).toBe(true);
    expect(new URL(url).searchParams.get("client_id")).toBe("kakao_client");
    expect(new URL(url).searchParams.get("scope")).toBe("account_email");
  });
});

describe("sanitizeNext", () => {
  it("allows relative paths", () => {
    expect(sanitizeNext("/extension-connect?ext=abc")).toBe("/extension-connect?ext=abc");
  });
  it("blocks open redirects and falls back to /login", () => {
    expect(sanitizeNext("https://evil.com")).toBe("/login");
    expect(sanitizeNext("//evil.com")).toBe("/login");
    expect(sanitizeNext("")).toBe("/login");
    expect(sanitizeNext(null)).toBe("/login");
  });
});

describe("social state cookie", () => {
  it("round-trips through base64url encoding", () => {
    const payload = createSocialState("/dashboard", 1_700_000_000_000);
    const decoded = decodeSocialState(encodeSocialState(payload), 1_700_000_000_000);
    expect(decoded).toEqual(payload);
  });
  it("rejects expired state", () => {
    const payload = createSocialState("/dashboard", 1_700_000_000_000);
    expect(decodeSocialState(encodeSocialState(payload), 1_700_000_000_000 + 11 * 60 * 1000)).toBeNull();
  });
  it("rejects garbage", () => {
    expect(decodeSocialState("not-json", Date.now())).toBeNull();
    expect(decodeSocialState(null, Date.now())).toBeNull();
  });
});

describe("resolveSocialEmail", () => {
  it("uses the profile email lowercased when present", () => {
    const email = resolveSocialEmail({
      provider: "naver",
      id: "123",
      email: "User@Example.com",
      name: "홍길동"
    });
    expect(email).toBe("user@example.com");
  });
  it("falls back to a stable synthetic email when the provider returns none (kakao)", () => {
    const profile = { provider: "kakao" as const, id: "987654", email: null, name: "김카카오" };
    const email = resolveSocialEmail(profile);
    expect(email).toBe(socialEmailFallback(profile));
    expect(email).toBe("kakao_987654@social.reviewboost.co.kr");
  });
});

describe("exchangeSocialCode / fetchSocialProfile", () => {
  beforeEach(() => {
    process.env.NAVER_CLIENT_ID = "naver_client";
    process.env.NAVER_CLIENT_SECRET = "naver_secret";
    process.env.KAKAO_CLIENT_ID = "kakao_client";
  });
  afterEach(() => {
    delete process.env.NAVER_CLIENT_ID;
    delete process.env.NAVER_CLIENT_SECRET;
    delete process.env.KAKAO_CLIENT_ID;
    vi.restoreAllMocks();
  });

  it("exchanges a Naver code for an access token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ access_token: "tok_1" }), { status: 200 })
      )
    );
    const token = await exchangeSocialCode("naver", {
      code: "c1",
      redirectUrl: "https://reviewboost.app/api/auth/social/naver/callback"
    });
    expect(token).toBe("tok_1");
    const called = (fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(called[0]).toBe("https://nid.naver.com/oauth2.0/token");
    expect(called[1]?.body).toContain("client_secret=naver_secret");
  });

  it("returns null when the token exchange fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("nope", { status: 400 })));
    expect(
      await exchangeSocialCode("kakao", { code: "bad", redirectUrl: "https://x/cb" })
    ).toBeNull();
  });

  it("parses the Naver profile response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ resultcode: "00", response: { id: "n1", email: "a@b.com", name: "김네이버" } }),
          { status: 200 }
        )
      )
    );
    const profile = await fetchSocialProfile("naver", "tok");
    expect(profile).toEqual({ provider: "naver", id: "n1", email: "a@b.com", name: "김네이버" });
  });

  it("parses the Kakao profile response (nickname only, no email)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ id: 123456, kakao_account: { profile: { nickname: "김카카오" } } }),
          { status: 200 }
        )
      )
    );
    const profile = await fetchSocialProfile("kakao", "tok");
    expect(profile).toEqual({ provider: "kakao", id: "123456", email: null, name: "김카카오" });
  });

  it("returns null when the profile request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("no", { status: 500 })));
    expect(await fetchSocialProfile("naver", "tok")).toBeNull();
  });
});
