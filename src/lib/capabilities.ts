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
  /** 익스텐션 유료(수집 무제한) 구독 여부 — 분석 플랜(plan)과 별개. */
  extensionPlan?: boolean;
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
