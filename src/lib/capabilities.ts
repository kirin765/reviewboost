import { getSupabaseDeployment } from "@/lib/supabase/keys";

import type { PlanTier } from "@/lib/plan";

export type Capabilities = {
  supabaseConfigured: boolean;
  openaiConfigured: boolean;
  plan: PlanTier;
  planLabel: string;
  monthlyLimit: number | null;
  monthlyUsed: number;
  aiAdvancedAvailable: boolean;
};

export function isSupabaseConfigured() {
  const deployment = getSupabaseDeployment();
  const url = process.env[`SUPABASE_URL_${deployment}`] || process.env.SUPABASE_URL;
  const anonKey =
    process.env[`NEXT_PUBLIC_SUPABASE_ANON_KEY_${deployment}`] ||
    process.env[`SUPABASE_ANON_KEY_${deployment}`] ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;
  return Boolean(url && anonKey);
}

export function getCapabilitiesBase() {
  const supabaseConfigured = isSupabaseConfigured();
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  return { supabaseConfigured, openaiConfigured };
}
