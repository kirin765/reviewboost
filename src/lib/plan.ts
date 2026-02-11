export type PlanTier = "free" | "basic" | "pro";

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

export function monthlyLimitForPlan(plan: PlanTier): number | null {
  const free = Number(process.env.PLAN_FREE_MONTHLY_LIMIT ?? "30");
  const basic = Number(process.env.PLAN_BASIC_MONTHLY_LIMIT ?? "500");
  const pro = Number(process.env.PLAN_PRO_MONTHLY_LIMIT ?? "1500");

  if (plan === "pro") return Number.isFinite(pro) ? pro : 1500;
  if (plan === "basic") return Number.isFinite(basic) ? basic : 500;
  return Number.isFinite(free) ? free : 30;
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

