import { getSupabaseAdminClient } from "@/lib/supabase_server";
import type { PlanTier } from "@/lib/plan";

type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "completed"
  | "paid"
  | "canceled"
  | "paused"
  | "inactive";

type BillingSubscriptionRow = {
  plan_tier?: string | null;
  status?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  updated_at?: string | null;
  paddle_subscription_id?: string | null;
};

const ACTIVE_STATUSES = new Set<SubscriptionStatus>(["trialing", "active", "past_due", "completed", "paid"]);
const KNOWN_STATUSES = new Set<SubscriptionStatus>([
  "trialing",
  "active",
  "past_due",
  "completed",
  "paid",
  "canceled",
  "paused",
  "inactive"
]);

export function billingToIso(v?: string | number | null): string | null {
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (!trimmed) return null;

    if (/^\d+$/.test(trimmed)) {
      const numeric = Number(trimmed);
      return Number.isFinite(numeric) ? billingToIso(numeric) : null;
    }

    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  if (typeof v === "number" && Number.isFinite(v)) {
    const millis = Math.abs(v) >= 1_000_000_000_000 ? v : v * 1000;
    const parsed = new Date(millis);
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
  }

  return null;
}

export function normalizeBillingTimestamp(v?: string | number | null): string | null {
  return billingToIso(v);
}

function timestampToMillis(v?: string | number | null): number {
  const iso = billingToIso(v);
  if (!iso) return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function normalizeSubscriptionStatus(status: string | null | undefined): SubscriptionStatus {
  const normalized = String(status ?? "").trim().toLowerCase() as SubscriptionStatus;
  return KNOWN_STATUSES.has(normalized) ? normalized : "inactive";
}

export function isBillingActiveStatus(status: string | null | undefined): boolean {
  return ACTIVE_STATUSES.has(normalizeSubscriptionStatus(status));
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
    const { data: userSubscriptions } = await admin
      .from("subscriptions")
      .select("plan_tier,status,current_period_start,current_period_end,updated_at,paddle_subscription_id")
      .eq("user_id", userId)
      .limit(50);

    let dataToEvaluate = userSubscriptions ?? [];

    if (dataToEvaluate.length === 0) {
      const paddleCustomerId = await findPaddleCustomerIdByUserId(userId);
      if (paddleCustomerId) {
        const { data: customerSubscriptions } = await admin
          .from("subscriptions")
          .select("plan_tier,status,current_period_start,current_period_end,updated_at,paddle_subscription_id")
          .eq("paddle_customer_id", paddleCustomerId)
          .limit(50);
        dataToEvaluate = customerSubscriptions ?? [];

        if (dataToEvaluate.length > 0) {
          await admin
            .from("subscriptions")
            .update({ user_id: userId, updated_at: new Date().toISOString() })
            .eq("paddle_customer_id", paddleCustomerId)
            .is("user_id", null);
        }
      }
    }

    const activePaidSubscriptions = dataToEvaluate
      .filter((row: BillingSubscriptionRow) => {
        const tier = String(row.plan_tier ?? "");
        return isBillingActiveStatus(row.status) && (tier === "basic" || tier === "pro");
      })
      .sort((a: BillingSubscriptionRow, b: BillingSubscriptionRow) => {
        const periodEndDiff =
          timestampToMillis(b.current_period_end) - timestampToMillis(a.current_period_end);
        if (periodEndDiff !== 0) return periodEndDiff;

        const updatedDiff = timestampToMillis(b.updated_at) - timestampToMillis(a.updated_at);
        if (updatedDiff !== 0) return updatedDiff;

        return String(b.paddle_subscription_id ?? "").localeCompare(
          String(a.paddle_subscription_id ?? "")
        );
      });

    if (activePaidSubscriptions.length > 0) {
      const tier = String(activePaidSubscriptions[0].plan_tier);
      if (tier === "basic" || tier === "pro") {
        return tier;
      }
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
      status: normalizeSubscriptionStatus(args.status),
      plan_tier: args.planTier,
      current_period_start: billingToIso(args.currentPeriodStart),
      current_period_end: billingToIso(args.currentPeriodEnd),
      cancel_at_period_end: Boolean(args.cancelAtPeriodEnd),
      updated_at: new Date().toISOString()
    },
    { onConflict: "paddle_subscription_id" }
  );
}
