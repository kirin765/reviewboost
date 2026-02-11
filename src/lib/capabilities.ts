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

export function getCapabilitiesBase() {
  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  return { supabaseConfigured, openaiConfigured };
}
