import { getGatesForPlan } from "@/lib/plan_gates";
import { resolvePlanTierByBilling } from "@/lib/billing";
import type { PlanTier } from "@/lib/types";
export type { PlanTier };

function parseEmailList(raw: string | undefined): Set<string> {
  return new Set(
    String(raw ?? "")
      .split(",")
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function resolvePlanTier(email: string | null | undefined): PlanTier {
  const normalized = String(email ?? "").trim().toLowerCase();
  if (!normalized) return "free";

  const proEmails = parseEmailList(process.env.PLAN_PRO_EMAILS);
  if (proEmails.has(normalized)) return "pro";

  const basicEmails = parseEmailList(process.env.PLAN_BASIC_EMAILS);
  if (basicEmails.has(normalized)) return "basic";

  return "free";
}

export async function resolvePlanTierForUser(args: {
  userId?: string | null;
  email?: string | null;
}): Promise<PlanTier> {
  const fallback = resolvePlanTier(args.email ?? null);
  return resolvePlanTierByBilling({
    userId: args.userId ?? null,
    fallbackPlan: fallback
  });
}

export function monthlyLimitForPlan(plan: PlanTier): number | null {
  const gates = getGatesForPlan(plan);
  return gates.monthlyAnalysisLimit;
}

export function canUseAdvancedAi(plan: PlanTier): boolean {
  return plan === "basic" || plan === "pro";
}

export function planLabel(plan: PlanTier): string {
  if (plan === "pro") return "Pro";
  if (plan === "basic") return "Basic";
  return "Free";
}

export function monthStartIso(d = new Date()): string {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1, 0, 0, 0, 0)).toISOString();
}
