export type CookieOptions = {
  domain?: string;
  path?: string;
  maxAge?: number;
  expires?: Date;
  sameSite?: "lax" | "strict" | "none" | boolean;
  secure?: boolean;
  httpOnly?: boolean;
  partitioned?: boolean;
} | undefined;

export function normalizeCookieOptions(options: CookieOptions, secureContext: boolean) {
  return {
    ...options,
    sameSite: options?.sameSite ?? "lax",
    secure: options?.secure ?? secureContext,
    httpOnly: options?.httpOnly ?? true
  };
}

/**
 * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 에서 Clerk Frontend API 호스트를 추출한다.
 * pk 형식: pk_(test|live)_<base64("<fapi-host>$")> — 예: clerk.reviewboost.co.kr$
 * dev 인스턴스(awaited-mustang-28.clerk.accounts.dev)와 prod 커스텀 도메인 모두 커버.
 */
export function clerkFrontendApiHost(): string | null {
  const pk = String(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "").trim();
  const b64 = pk.replace(/^pk_(test|live)_/, "");
  if (!b64) return null;
  try {
    const decoded = Buffer.from(b64, "base64").toString("utf8").replace(/\$$/, "").trim();
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(decoded) ? decoded : null;
  } catch {
    return null;
  }
}

export function applySecurityHeaders(headers: Headers) {
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Clerk loads clerk.browser.js + Turnstile from these hosts; the FAPI host is
  // derived from the publishable key (dev *.clerk.accounts.dev or prod custom domain).
  const clerkHost = clerkFrontendApiHost();
  const clerkSources = `https://${clerkHost ?? "*.clerk.accounts.dev"} https://challenges.cloudflare.com`;
  // Paddle billing (paddle.js + checkout overlay) and the Pretendard font CSS on jsDelivr.
  // profitwell.com is auto-injected by paddle.js (Retain); googletagmanager.com is our GA loader.
  const paddleScript = "https://cdn.paddle.com https://sandbox-cdn.paddle.com https://public.profitwell.com https://www.googletagmanager.com";
  const paddleFrame = "https://buy.paddle.com https://sandbox-buy.paddle.com";
  const jsdelivr = "https://cdn.jsdelivr.net";
  headers.set("Content-Security-Policy", `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkSources} ${paddleScript}; style-src 'self' 'unsafe-inline' ${jsdelivr} ${paddleScript}; img-src 'self' data: blob: https:; font-src 'self' data: ${jsdelivr}; connect-src 'self' https:; worker-src 'self' blob:; frame-src 'self' https://challenges.cloudflare.com ${paddleFrame}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);

  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}
