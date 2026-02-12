import { getSupabaseAdminClient } from "@/lib/supabase_server";
import type { PlanTier } from "@/lib/plan";

type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "paused"
  | "inactive";

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(["trialing", "active", "past_due"]);

function toIso(v?: string | number | null): string | null {
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    // Unix seconds support
    return new Date(v * 1000).toISOString();
  }
  return null;
}

export function isBillingActiveStatus(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has(String(status ?? "") as SubscriptionStatus);
}

export async function resolvePlanTierByBilling(args: {
  userId?: string | null;
  fallbackPlan: PlanTier;
}): Promise<PlanTier> {
  const userId = args.userId ?? null;
  if (!userId) return args.fallbackPlan;

  const admin = getSupabaseAdminClient();
  if (!admin) return args.fallbackPlan;

  try {
    const { data } = await admin
      .from("subscriptions")
      .select("plan_tier,status,current_period_end")
      .eq("user_id", userId)
      .order("current_period_end", { ascending: false, nullsFirst: false })
      .limit(10);

    for (const row of data ?? []) {
      const status = String(row.status ?? "");
      const tier = String(row.plan_tier ?? "free");
      if (isBillingActiveStatus(status) && (tier === "basic" || tier === "pro")) return tier;
    }
  } catch {
    // keep fallback
  }

  return args.fallbackPlan;
}

export async function upsertProfileCustomer(userId: string, paddleCustomerId: string) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  await admin.from("profiles").upsert(
    {
      user_id: userId,
      paddle_customer_id: paddleCustomerId,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );
}

export async function findUserIdByPaddleCustomerId(paddleCustomerId: string): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin
    .from("profiles")
    .select("user_id")
    .eq("paddle_customer_id", paddleCustomerId)
    .maybeSingle();

  return (data?.user_id as string | undefined) ?? null;
}

export async function findPaddleCustomerIdByUserId(userId: string): Promise<string | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  const { data } = await admin.from("profiles").select("paddle_customer_id").eq("user_id", userId).maybeSingle();

  const id = String(data?.paddle_customer_id ?? "").trim();
  return id || null;
}

export async function upsertSubscription(args: {
  userId: string;
  paddleSubscriptionId: string;
  paddleCustomerId: string;
  paddlePriceId?: string | null;
  status: string;
  planTier: PlanTier;
  currentPeriodStart?: string | number | null;
  currentPeriodEnd?: string | number | null;
  cancelAtPeriodEnd?: boolean | null;
}) {
  const admin = getSupabaseAdminClient();
  if (!admin) return;

  await admin.from("subscriptions").upsert(
    {
      user_id: args.userId,
      paddle_customer_id: args.paddleCustomerId,
      paddle_subscription_id: args.paddleSubscriptionId,
      paddle_price_id: args.paddlePriceId ?? null,
      status: args.status,
      plan_tier: args.planTier,
      current_period_start: toIso(args.currentPeriodStart),
      current_period_end: toIso(args.currentPeriodEnd),
      cancel_at_period_end: Boolean(args.cancelAtPeriodEnd),
      updated_at: new Date().toISOString()
    },
    { onConflict: "paddle_subscription_id" }
  );
}
