import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { applySecurityHeaders, normalizeCookieOptions } from "@/lib/security";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

export async function middleware(request: NextRequest) {
  // Handle auth callback redirects at root
  if (request.nextUrl.pathname === "/") {
    const code = request.nextUrl.searchParams.get("code");
    const tokenHash = request.nextUrl.searchParams.get("token_hash");
    const type = request.nextUrl.searchParams.get("type");

    if (code) {
      // Legacy ?code= parameter - redirect to /auth/callback
      const url = request.nextUrl.clone();
      url.pathname = "/auth/callback";
      return NextResponse.redirect(url);
    }

    if (tokenHash && type) {
      // New token_hash + type format - redirect to /auth/confirm
      const url = request.nextUrl.clone();
      url.pathname = "/auth/confirm";
      return NextResponse.redirect(url);
    }
  }

  // /help is owned by root in some environments; serve the writable checklist page instead.
  if (request.nextUrl.pathname === "/help") {
    const url = request.nextUrl.clone();
    url.pathname = "/help-checklist";
    return NextResponse.rewrite(url);
  }

  // Skip Supabase session refresh on public routes to reduce TTFB
  const publicPaths = ["/", "/help", "/help-checklist", "/pricing", "/term", "/privacy", "/blog", "/coupang-csv"];
  const isPublicRoute = publicPaths.some(p => request.nextUrl.pathname === p);
  if (isPublicRoute) {
    const passthrough = NextResponse.next();
    applySecurityHeaders(passthrough.headers);
    return passthrough;
  }

  let supabaseUrl: string;
  let supabaseAnonKey: string;

  try {
    supabaseUrl = getSupabaseUrl();
    supabaseAnonKey = getSupabaseAnonKey();
  } catch {
    const passthrough = NextResponse.next();
    applySecurityHeaders(passthrough.headers);
    return passthrough;
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

  applySecurityHeaders(response.headers);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
