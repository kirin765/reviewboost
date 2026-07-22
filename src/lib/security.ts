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

export function applySecurityHeaders(headers: Headers) {
  headers.set("X-Frame-Options", "DENY");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // Clerk loads clerk.browser.js + Turnstile from these hosts; a prod custom Clerk domain must be added here too.
  const clerkSources = "https://*.clerk.accounts.dev https://challenges.cloudflare.com";
  // Paddle billing (paddle.js + checkout overlay) and the Pretendard font CSS on jsDelivr.
  const paddleScript = "https://cdn.paddle.com https://sandbox-cdn.paddle.com";
  const paddleFrame = "https://buy.paddle.com https://sandbox-buy.paddle.com";
  const jsdelivr = "https://cdn.jsdelivr.net";
  headers.set("Content-Security-Policy", `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkSources} ${paddleScript}; style-src 'self' 'unsafe-inline' ${jsdelivr} ${paddleScript}; img-src 'self' data: blob: https:; font-src 'self' data: ${jsdelivr}; connect-src 'self' https:; worker-src 'self' blob:; frame-src 'self' https://challenges.cloudflare.com ${paddleFrame}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'`);

  if (process.env.NODE_ENV === "production") {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
  }
}
