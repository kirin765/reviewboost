import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";
import { normalizeCookieOptions } from "@/lib/security";

function createSupabaseClient(allowSetCookies: boolean) {
  const cookieStore = cookies();
  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: any[]) {
        // Server Components cannot set cookies; do session refresh in middleware.
        if (!allowSetCookies) return;
        const secureContext = process.env.NODE_ENV === "production";
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, normalizeCookieOptions(options, secureContext));
        }
      }
    }
  });
}

export function createSupabaseServerComponentClient() {
  return createSupabaseClient(false);
}

export function createSupabaseServerActionClient() {
  return createSupabaseClient(true);
}
