import type { PlanTier } from "@/lib/plan";

export type Capabilities = {
  databaseConfigured: boolean;
  authConfigured: boolean;
  openaiConfigured: boolean;
  plan: PlanTier;
  planLabel: string;
  monthlyLimit: number | null;
  monthlyUsed: number;
  aiAdvancedAvailable: boolean;
};

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function isAuthConfigured() {
  return Boolean(process.env.CLERK_SECRET_KEY);
}

export function getCapabilitiesBase() {
  const databaseConfigured = isDatabaseConfigured();
  const authConfigured = isAuthConfigured();
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  return { databaseConfigured, authConfigured, openaiConfigured };
}
