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
  return Boolean(
    (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL) &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY)
  );
}

export function getCapabilitiesBase() {
  const supabaseConfigured = isSupabaseConfigured();
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  return { supabaseConfigured, openaiConfigured };
}
