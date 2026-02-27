import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";
import { normalizeCookieOptions } from "@/lib/security";
import type { CookieOptions } from "@/lib/security";

async function createSupabaseClient(allowSetCookies: boolean) {
  const cookieStore = await (cookies() as any);

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
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
