import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { applySecurityHeaders, normalizeCookieOptions } from "@/lib/security";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

function withSecurity(response: NextResponse) {
  applySecurityHeaders(response.headers);
  return response;
}

function isPublicPath(pathname: string) {
  return (
    pathname === "/" ||
    pathname === "/pricing" ||
    pathname === "/coupang-csv" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname.startsWith("/features") ||
    pathname.startsWith("/help") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/sitemaps/")
  );
}

export async function middleware(request: NextRequest) {
  if (request.nextUrl.pathname === "/term") {
    const url = request.nextUrl.clone();
    url.pathname = "/terms";
    return withSecurity(NextResponse.redirect(url, 301));
  }

  if (request.nextUrl.pathname === "/help-checklist") {
    const url = request.nextUrl.clone();
    url.pathname = "/help/csv-checklist";
    return withSecurity(NextResponse.redirect(url, 301));
  }

  if (isPublicPath(request.nextUrl.pathname)) {
    return withSecurity(NextResponse.next());
  }

  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    supabaseUrl = getSupabaseUrl();
    supabaseAnonKey = getSupabaseAnonKey();
  } catch {
    return withSecurity(NextResponse.next());
  }

  const secureContext = request.nextUrl.protocol === "https:" || process.env.NODE_ENV === "production";
  let response = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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

    // Refresh session cookies (no-op if session is valid/absent).
    await supabase.auth.getUser();
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[middleware] supabase session refresh failed:", error);
    }
  }

  return withSecurity(response);
}

export const config = {
  matcher: ["/((?!$|_next/static|_next/image|favicon.ico|manifest.json|sample\\.csv|sample_simple\\.csv).*)"]
};
