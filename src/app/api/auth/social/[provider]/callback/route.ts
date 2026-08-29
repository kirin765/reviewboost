import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { appBaseUrl } from "@/lib/paddle";
import {
  decodeSocialState,
  exchangeSocialCode,
  fetchSocialProfile,
  resolveSocialEmail,
  SOCIAL_STATE_COOKIE,
  socialRedirectUrl,
  type SocialProvider
} from "@/lib/social_auth";

export const runtime = "nodejs";

const PROVIDERS = new Set(["naver", "kakao"]);

/**
 * 네이버/카카오 OAuth 콜백.
 * code 교환 → 프로필 → 이메일로 Clerk 사용자 조회/생성 → **Clerk sign-in token 발급**
 * → /login?__clerk_ticket=...&redirect_url=... 로 리다이렉트 → 앱의 Clerk 위젯이
 * 티켓을 자동 교환해 세션 생성 + __session 쿠키 설정.
 *
 * ⚠️ 프로덕션에서 BAPI `sessions.createSession` 은 개발 전용이라 사용 불가
 * (400 request_invalid_for_environment). 공식 대안이 sign-in token 이다.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!PROVIDERS.has(provider)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const typed = provider as SocialProvider;

  const statePayload = decodeSocialState(req.cookies.get(SOCIAL_STATE_COOKIE)?.value);
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");

  const failRedirect = (error: string) => {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", error);
    const res = NextResponse.redirect(url);
    res.cookies.delete(SOCIAL_STATE_COOKIE);
    return res;
  };

  if (!code || !state || !statePayload || state !== statePayload.state) {
    return failRedirect("social_state_mismatch");
  }

  const redirectUrl = socialRedirectUrl(typed, appBaseUrl(req));
  const accessToken = await exchangeSocialCode(typed, { code, redirectUrl });
  if (!accessToken) {
    return failRedirect("social_token_failed");
  }

  const profile = await fetchSocialProfile(typed, accessToken);
  if (!profile) {
    return failRedirect("social_profile_failed");
  }

  const email = resolveSocialEmail(profile);
  const next = statePayload.next;

  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();

    const existing = await client.users.getUserList({ emailAddress: [email], limit: 1 });
    let user = existing?.data?.[0] ?? null;

    if (!user) {
      // 인스턴스 auth config 가 password: required 라서 OAuth 전용 유저도
      // 비밀번호 자격이 필요하다 (400 form_data_missing). 랜덤 생성 —
      // 유저는 네이버/카카오 sign-in token 으로만 로그인하고,
      // 필요 시 "비밀번호 재설정"으로 직접 설정할 수 있다.
      user = await client.users.createUser({
        emailAddress: [email],
        ...(profile.name ? { firstName: profile.name } : {}),
        password: randomBytes(18).toString("base64url")
      });
    }

    // 프로덕션 sign-in: BAPI 세션 생성은 dev 전용 → sign-in token 발급 후
    // /login?__clerk_ticket=... 으로 보내면 앱 페이지에서 Clerk 위젯이 자동 교환한다
    // (실측 2026-08-29: __clerk_ticket + redirect_url 파라미터로 세션 생성/리다이렉트 확인됨).
    const signInToken = await client.signInTokens.createSignInToken({
      userId: user.id,
      expiresInSeconds: 600
    });
    if (!signInToken?.token) {
      return failRedirect("social_session_failed");
    }

    const url = new URL("/login", req.url);
    url.searchParams.set("__clerk_ticket", signInToken.token);
    const landing = next === "/" || next === "/login" ? "/dashboard" : next;
    url.searchParams.set("redirect_url", new URL(landing, req.url).toString());

    const res = NextResponse.redirect(url);
    res.cookies.delete(SOCIAL_STATE_COOKIE);
    return res;
  } catch (err) {
    // 오류 관측용 — 예외 자체는 클라이언트에 노출하지 않고 로그로만 남긴다
    const reason = (err as { errors?: Array<{ message?: string }> })?.errors?.[0]?.message
      ?? (err instanceof Error ? err.message : String(err));
    console.error(`[social-auth] ${typed} callback failed: ${reason}`);
    return failRedirect("social_server_error");
  }
}
