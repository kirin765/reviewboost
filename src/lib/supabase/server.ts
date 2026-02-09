import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

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
        for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
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
