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

type ConfirmNotice = {
  kind: "notice" | "error";
  message: string;
};

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

function mapSupabaseAuthError(errorCode: string | null, errorDescription: string | null, errorMessage: string | null): ConfirmNotice {
  const code = String(errorCode ?? "").trim().toLowerCase();
  const message = String(errorDescription ?? errorMessage ?? "").trim().toLowerCase();

  if (
    code === "otp_expired" ||
    code === "otp_invalid" ||
    code === "access_denied" ||
    message.includes("invalid") ||
    message.includes("expired")
  ) {
    return {
      kind: "notice",
      message: "인증 링크가 만료되었거나 이미 사용된 링크입니다. 로그인 화면에서 계속 진행해주세요."
    };
  }

  return {
    kind: "error",
    message: "유효하지 않은 이메일 인증 링크입니다."
  };
}

function mapVerifyOtpError(error: Error | null): ConfirmNotice {
  if (!error) {
    return {
      kind: "error",
      message: "이메일 인증 처리 중 오류가 발생했습니다."
    };
  }

  const message = String(error.message ?? "").toLowerCase();
  if (message.includes("expired") || message.includes("already") || message.includes("invalid")) {
    return {
      kind: "notice",
      message: "인증 링크가 만료되었거나 이미 사용된 링크입니다. 로그인 화면에서 계속 진행해주세요."
    };
  }

  return {
    kind: "error",
    message: "이메일 인증에 실패했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다."
  };
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const token = requestUrl.searchParams.get("token");
  const errorCode = requestUrl.searchParams.get("error_code");
  const errorDescription = requestUrl.searchParams.get("error_description");
  const errorMessage = requestUrl.searchParams.get("error");
  const code = requestUrl.searchParams.get("code");
  const type = requestUrl.searchParams.get("type");
  const next = safeNextPath(requestUrl.searchParams.get("next"), "/dashboard");

  const baseUrl = getBaseUrl(request);
  const loginUrl = new URL("/login", baseUrl);
  loginUrl.searchParams.set("next", next);

  if (errorCode || errorDescription || errorMessage) {
    const mapped = mapSupabaseAuthError(errorCode, errorDescription, errorMessage);
    if (mapped.kind === "notice") {
      loginUrl.searchParams.set("notice", mapped.message);
    } else {
      loginUrl.searchParams.set("error", mapped.message);
    }
    const immediate = NextResponse.redirect(loginUrl);
    applySecurityHeaders(immediate.headers);
    return immediate;
  }

  if ((!tokenHash && !token && !code) || !type || !OTP_TYPES.has(type as EmailOtpType)) {
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
      setAll(cookiesToSet: any[]) {
        for (const { name, value, options } of cookiesToSet) {
          const hardenedOptions = normalizeCookieOptions(options, secureContext);
          request.cookies.set(name, value);
          response.cookies.set(name, value, hardenedOptions);
        }
      }
    }
  });

  const otpType = type as EmailOtpType;
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({
      type: otpType,
      // Newer/PKCE flow can provide `token`; legacy flow provides `token_hash`.
      token_hash: tokenHash || token
    });

  if (error) {
    const mapped = mapVerifyOtpError(error);
    if (mapped.kind === "notice") {
      loginUrl.searchParams.set("notice", mapped.message);
    } else {
      loginUrl.searchParams.set("error", mapped.message);
    }
    const res = NextResponse.redirect(loginUrl);
    applySecurityHeaders(res.headers);
    return res;
  }

  loginUrl.searchParams.set("notice", "이메일 인증이 완료되었습니다. 로그인해주세요.");
  const res = NextResponse.redirect(loginUrl);
  applySecurityHeaders(res.headers);
  return res;
}
