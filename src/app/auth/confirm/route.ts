import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";
import { applySecurityHeaders, normalizeCookieOptions } from "@/lib/security";

const OTP_TYPES: ReadonlySet<EmailOtpType> = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email"
]);

function safeNextPath(raw: string | null, fallback: string) {
  if (!raw) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//")) return fallback;
  return raw;
}

function getBaseUrl(request: NextRequest) {
  // Use APP_BASE_URL if set, otherwise try to detect from request
  const appBaseUrl = process.env.APP_BASE_URL;
  if (appBaseUrl) return appBaseUrl;
  
  // Fallback: try to get from request headers
  const host = request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (host) {
    return forwardedProto ? `${forwardedProto}://${host}` : `https://${host}`;
  }
  return "http://localhost:3000";
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeNextPath(requestUrl.searchParams.get("next"), "/dashboard");

  const baseUrl = getBaseUrl(request);
  const loginUrl = new URL("/login", baseUrl);
  loginUrl.searchParams.set("next", next);

  if (!tokenHash || !type || !OTP_TYPES.has(type as EmailOtpType)) {
    loginUrl.searchParams.set("error", "유효하지 않은 이메일 인증 링크입니다.");
    const res = NextResponse.redirect(loginUrl);
    applySecurityHeaders(res.headers);
    return res;
  }

  const secureContext = requestUrl.protocol === "https:" || process.env.NODE_ENV === "production";
  let response = NextResponse.next({ request });
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }>) {
        for (const { name, value, options } of cookiesToSet) {
          const hardenedOptions = normalizeCookieOptions(options, secureContext);
          request.cookies.set(name, value);
          response.cookies.set(name, value, hardenedOptions);
        }
      }
    }
  });

  const { error } = await supabase.auth.verifyOtp({
    type: type as EmailOtpType,
    token_hash: tokenHash
  });

  if (error) {
    loginUrl.searchParams.set("error", "이메일 인증에 실패했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다.");
    const res = NextResponse.redirect(loginUrl);
    applySecurityHeaders(res.headers);
    return res;
  }

  loginUrl.searchParams.set("notice", "이메일 인증이 완료되었습니다. 로그인해주세요.");
  const res = NextResponse.redirect(loginUrl);
  applySecurityHeaders(res.headers);
  return res;
}
