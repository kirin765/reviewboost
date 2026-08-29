import { randomBytes } from "node:crypto";

/**
 * 네이버/카카오 OAuth2 헬퍼 (Clerk 공식 지원이 없어 브릿지로 연결).
 *
 * 흐름: start(인가 URL + state 쿠키) → callback(code 교환 → 프로필 → Clerk 사용자
 * 조회/생성 → Clerk 세션 생성 → __session 쿠키 설정 → next 리다이렉트).
 * 세션은 그대로 Clerk 이므로 middleware/auth()/기존 로직이 그대로 동작한다.
 */

export type SocialProvider = "naver" | "kakao";

export type SocialProfile = {
  provider: SocialProvider;
  id: string;
  email: string | null;
  name: string | null;
};

function env(name: string): string {
  return String(process.env[name] ?? "").trim();
}

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  profileUrl: string;
  scope: string;
};

function providerConfig(provider: SocialProvider): ProviderConfig {
  return provider === "naver"
    ? {
        authorizeUrl: "https://nid.naver.com/oauth2.0/authorize",
        tokenUrl: "https://nid.naver.com/oauth2.0/token",
        profileUrl: "https://openapi.naver.com/v1/nid/me",
        scope: "email"
      }
    : {
        authorizeUrl: "https://kauth.kakao.com/oauth/authorize",
        tokenUrl: "https://kauth.kakao.com/oauth/token",
        profileUrl: "https://kapi.kakao.com/v2/user/me",
        scope: "account_email"
      };
}

export function socialClientId(provider: SocialProvider): string {
  return env(provider === "naver" ? "NAVER_CLIENT_ID" : "KAKAO_CLIENT_ID");
}

export function socialClientSecret(provider: SocialProvider): string {
  return env(provider === "naver" ? "NAVER_CLIENT_SECRET" : "KAKAO_CLIENT_SECRET");
}

export function isSocialProviderConfigured(provider: SocialProvider): boolean {
  return Boolean(socialClientId(provider));
}

/** 콜백 URL — env 우선, 없으면 APP_BASE_URL 에서 파생. */
export function socialRedirectUrl(provider: SocialProvider, baseUrl?: string | null): string {
  const explicit = env(provider === "naver" ? "NAVER_REDIRECT_URL" : "KAKAO_REDIRECT_URL");
  if (explicit) return explicit;
  const origin = String(baseUrl ?? "").trim().replace(/\/$/, "");
  return `${origin}/api/auth/social/${provider}/callback`;
}

export function buildAuthorizeUrl(
  provider: SocialProvider,
  opts: { state: string; redirectUrl: string }
): string {
  const cfg = providerConfig(provider);
  const params = new URLSearchParams({
    response_type: "code",
    client_id: socialClientId(provider),
    redirect_uri: opts.redirectUrl,
    state: opts.state,
    scope: cfg.scope
  });
  return `${cfg.authorizeUrl}?${params.toString()}`;
}

/** 인가 코드 → access token. 실패 시 null (start 쪽에서 로그인 실패로 처리). */
export async function exchangeSocialCode(
  provider: SocialProvider,
  opts: { code: string; redirectUrl: string }
): Promise<string | null> {
  const cfg = providerConfig(provider);
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: socialClientId(provider),
    redirect_uri: opts.redirectUrl,
    code: opts.code
  });
  const secret = socialClientSecret(provider);
  if (secret) body.set("client_secret", secret);

  let res: Response;
  try {
    res = await fetch(cfg.tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: body.toString()
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as { access_token?: unknown } | null;
  const token = typeof json?.access_token === "string" ? json.access_token : null;
  return token || null;
}

export async function fetchSocialProfile(
  provider: SocialProvider,
  accessToken: string
): Promise<SocialProfile | null> {
  const cfg = providerConfig(provider);
  let res: Response;
  try {
    res = await fetch(cfg.profileUrl, {
      headers: { authorization: `Bearer ${accessToken}` }
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json) return null;

  if (provider === "naver") {
    const response = (json.response ?? {}) as Record<string, unknown>;
    const id = String(response.id ?? "");
    if (!id) return null;
    return {
      provider,
      id,
      email: typeof response.email === "string" ? response.email : null,
      name: String(response.name ?? response.nickname ?? "") || null
    };
  }

  // kakao
  const id = String(json.id ?? "");
  if (!id) return null;
  const kakaoAccount = (json.kakao_account ?? {}) as Record<string, unknown>;
  const profile = (kakaoAccount.profile ?? {}) as Record<string, unknown>;
  return {
    provider,
    id,
    email: typeof kakaoAccount.email === "string" ? kakaoAccount.email : null,
    name: String(profile.nickname ?? "") || null
  };
}

/** 이메일 미제공(특히 카카오) 사용자를 위한 안정적 합성 이메일. */
export function socialEmailFallback(profile: SocialProfile): string {
  return `${profile.provider}_${profile.id}@social.reviewboost.co.kr`;
}

export function resolveSocialEmail(profile: SocialProfile): string {
  const email = String(profile.email ?? "").trim().toLowerCase();
  return email || socialEmailFallback(profile);
}

// --- state 쿠키 (CSRF/오픈리다이렉트 방지) ---

export type SocialStatePayload = { state: string; next: string; exp: number };

export const SOCIAL_STATE_COOKIE = "rb_social_state";
export const SOCIAL_STATE_TTL_MS = 10 * 60 * 1000;

export function createSocialState(next: string | null, now = Date.now()): SocialStatePayload {
  return { state: randomBytes(24).toString("hex"), next: sanitizeNext(next), exp: now + SOCIAL_STATE_TTL_MS };
}

/** 상대 경로만 허용(오픈 리다이렉트 방지). 기본 /login. */
export function sanitizeNext(next: string | null | undefined): string {
  const raw = String(next ?? "").trim();
  if (!raw.startsWith("/") || raw.startsWith("//")) return "/login";
  return raw;
}

export function encodeSocialState(payload: SocialStatePayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeSocialState(raw: string | null | undefined, now = Date.now()): SocialStatePayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as SocialStatePayload;
    if (typeof parsed.state !== "string" || typeof parsed.next !== "string") return null;
    if (typeof parsed.exp !== "number" || parsed.exp < now) return null;
    return parsed;
  } catch {
    return null;
  }
}
