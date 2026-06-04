import { getDb } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
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

  const db = getDb();
  if (!db) return args.fallbackPlan;

  const selectSubscriptionColumns = {
    plan_tier: subscriptions.planTier,
    status: subscriptions.status,
    current_period_start: subscriptions.currentPeriodStart,
    current_period_end: subscriptions.currentPeriodEnd,
    updated_at: subscriptions.updatedAt,
    paddle_subscription_id: subscriptions.paddleSubscriptionId
  };

  const toIso = (v: Date | string | null): string | null =>
    v instanceof Date ? v.toISOString() : v;

  try {
    const userSubscriptions = await db
      .select(selectSubscriptionColumns)
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(50);

    let dataToEvaluate = userSubscriptions;

    if (dataToEvaluate.length === 0) {
      const paddleCustomerId = await findPaddleCustomerIdByUserId(userId);
      if (paddleCustomerId) {
        dataToEvaluate = await db
          .select(selectSubscriptionColumns)
          .from(subscriptions)
          .where(eq(subscriptions.paddleCustomerId, paddleCustomerId))
          .limit(50);
      }
    }

    const normalized: BillingSubscriptionRow[] = dataToEvaluate.map((row) => ({
      plan_tier: row.plan_tier,
      status: row.status,
      current_period_start: toIso(row.current_period_start),
      current_period_end: toIso(row.current_period_end),
      updated_at: toIso(row.updated_at),
      paddle_subscription_id: row.paddle_subscription_id
    }));

    const activePaidSubscriptions = normalized
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
  const db = getDb();
  if (!db) return;

  await db
    .insert(profiles)
    .values({ userId, paddleCustomerId, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: profiles.userId,
      set: { paddleCustomerId, updatedAt: new Date() }
    });
}

export async function findUserIdByPaddleCustomerId(paddleCustomerId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ userId: profiles.userId })
    .from(profiles)
    .where(eq(profiles.paddleCustomerId, paddleCustomerId))
    .limit(1);

  return rows[0]?.userId ?? null;
}

export async function findPaddleCustomerIdByUserId(userId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;

  const rows = await db
    .select({ paddleCustomerId: profiles.paddleCustomerId })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const id = String(rows[0]?.paddleCustomerId ?? "").trim();
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
  const db = getDb();
  if (!db) return;

  const startIso = billingToIso(args.currentPeriodStart);
  const endIso = billingToIso(args.currentPeriodEnd);
  const values = {
    userId: args.userId,
    paddleCustomerId: args.paddleCustomerId,
    paddleSubscriptionId: args.paddleSubscriptionId,
    paddlePriceId: args.paddlePriceId ?? null,
    status: normalizeSubscriptionStatus(args.status),
    planTier: args.planTier,
    currentPeriodStart: startIso ? new Date(startIso) : null,
    currentPeriodEnd: endIso ? new Date(endIso) : null,
    cancelAtPeriodEnd: Boolean(args.cancelAtPeriodEnd),
    updatedAt: new Date()
  };

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.paddleSubscriptionId,
      set: {
        userId: values.userId,
        paddleCustomerId: values.paddleCustomerId,
        paddlePriceId: values.paddlePriceId,
        status: values.status,
        planTier: values.planTier,
        currentPeriodStart: values.currentPeriodStart,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        updatedAt: values.updatedAt
      }
    });
}
