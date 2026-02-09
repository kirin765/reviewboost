import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/keys";

export function createSupabaseBrowserClient() {
  // Uses localStorage session on the client.
  return createClient(getSupabaseUrl(), getSupabaseAnonKey());
}

