import { sanitizeCheckoutAttribution } from "@/lib/checkout-attribution";

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

/** Only call after verifying a Paddle transaction.completed/order.completed signature. */
export function buildPurchaseEvent(data: unknown, plan: string, now = Date.now()) {
  const transaction = record(data);
  const custom = record(transaction.custom_data);
  const attribution = sanitizeCheckoutAttribution(custom);
  const id = transaction.transaction_id ?? transaction.id;
  const currency = transaction.currency_code;
  const totals = record(record(transaction.details).totals);
  if (typeof id !== "string" || !/^txn_[a-z0-9]+$/.test(id) || !attribution.ga_client_id) return null;
  if (typeof currency !== "string" || !/^[A-Z]{3}$/.test(currency)) return null;
  if (totals.total == null || String(totals.total).trim() === "") return null;
  const total = Number(totals.total);
  const tax = Number(totals.tax ?? 0);
  if (!Number.isFinite(total) || !Number.isFinite(tax) || total < 0 || tax < 0 || tax > total) return null;
  const decimals = new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
  const divisor = 10 ** decimals;
  const value = (total - tax) / divisor;
  const checkoutAt = Number(custom.ga_checkout_at);
  // Paddle copies custom data to renewals. Never attach a renewal to an old checkout session.
  const recentCheckout = Number.isFinite(checkoutAt) && now >= checkoutAt && now - checkoutAt < 24 * 60 * 60 * 1000;
  const { ga_client_id: clientId, ga_session_id: sessionId, ...acquisition } = attribution;
  return {
    client_id: clientId,
    events: [{
      name: "purchase",
      params: {
        transaction_id: id,
        currency,
        value,
        tax: tax / divisor,
        ...(recentCheckout && sessionId ? { session_id: sessionId, engagement_time_msec: 1 } : {}),
        ...acquisition,
        plan_tier: plan,
        items: [{ item_id: plan, item_name: `ReviewBoost ${plan}`, price: value, quantity: 1 }]
      }
    }]
  };
}

export async function sendPurchaseAnalytics(data: unknown, plan: string): Promise<"sent" | "skipped"> {
  if (!["extension", "basic", "pro"].includes(plan)) return "skipped";
  const secret = process.env.GA4_API_SECRET;
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  if (!secret || !measurementId || process.env.PADDLE_ENV === "sandbox" ||
    (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")) return "skipped";
  const payload = buildPurchaseEvent(data, plan);
  // Don't manufacture identities for visitors whose analytics tag is unavailable/blocked.
  if (!payload) return "skipped";
  const url = new URL("https://www.google-analytics.com/mp/collect");
  url.searchParams.set("measurement_id", measurementId);
  url.searchParams.set("api_secret", secret);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) throw new Error("delivery failed");
  } catch {
    // Let Paddle retry the signed webhook; entitlement writes are idempotent.
    // Never include the request URL (which contains the secret) in logs/errors.
    throw new Error("purchase analytics delivery failed");
  }
  // GA deduplicates purchase events by transaction_id, including webhook retries.
  return "sent";
}
