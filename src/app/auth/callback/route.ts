import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  // Validate next path
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", safeNext);

  if (!code) {
    // No code parameter, redirect to login
    loginUrl.searchParams.set("error", "인증 코드가 없습니다.");
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    loginUrl.searchParams.set("error", "인증에 실패했습니다. 링크가 만료되었거나 이미 사용되었을 수 있습니다.");
    return NextResponse.redirect(loginUrl);
  }

  // Success - redirect to dashboard
  const dashboardUrl = new URL(safeNext, request.url);
  dashboardUrl.searchParams.set("notice", "로그인되었습니다.");
  return NextResponse.redirect(dashboardUrl);
}
