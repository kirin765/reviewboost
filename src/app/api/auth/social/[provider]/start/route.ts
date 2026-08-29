import { NextRequest, NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/paddle";
import {
  buildAuthorizeUrl,
  createSocialState,
  encodeSocialState,
  isSocialProviderConfigured,
  SOCIAL_STATE_COOKIE,
  SOCIAL_STATE_TTL_MS,
  socialRedirectUrl,
  type SocialProvider
} from "@/lib/social_auth";

export const runtime = "nodejs";

const PROVIDERS = new Set(["naver", "kakao"]);

/**
 * 네이버/카카오 OAuth 시작. state(CSRF) + next(오픈리다이렉트 방지)를
 * httpOnly 쿠키에 넣고 공식 인가 URL 로 307 리다이렉트한다.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  if (!PROVIDERS.has(provider)) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  const typed = provider as SocialProvider;

  if (!isSocialProviderConfigured(typed)) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "social_not_configured");
    return NextResponse.redirect(url);
  }

  const payload = createSocialState(req.nextUrl.searchParams.get("next"));
  const redirectUrl = socialRedirectUrl(typed, appBaseUrl(req));
  const authorizeUrl = buildAuthorizeUrl(typed, { state: payload.state, redirectUrl });

  const res = NextResponse.redirect(authorizeUrl, 307);
  res.cookies.set(SOCIAL_STATE_COOKIE, encodeSocialState(payload), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SOCIAL_STATE_TTL_MS / 1000)
  });
  return res;
}
