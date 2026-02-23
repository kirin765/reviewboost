import { createClient } from "@supabase/supabase-js";
import { getSupabaseDeployment } from "@/lib/supabase/keys";

export function getSupabaseAdminClient() {
  const deployment = getSupabaseDeployment();
  const url = process.env[`SUPABASE_URL_${deployment}`] || process.env.SUPABASE_URL;
  const key =
    process.env[`SUPABASE_SERVICE_ROLE_KEY_${deployment}`] || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}
