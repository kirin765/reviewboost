import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

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

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeNextPath(requestUrl.searchParams.get("next"), "/dashboard");

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", next);

  if (!tokenHash || !type || !OTP_TYPES.has(type as EmailOtpType)) {
    loginUrl.searchParams.set("error", "유효하지 않은 이메일 인증 링크입니다.");
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: any[]) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
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
    return NextResponse.redirect(loginUrl);
  }

  loginUrl.searchParams.set("notice", "이메일 인증이 완료되었습니다. 로그인해주세요.");
  return NextResponse.redirect(loginUrl);
}
