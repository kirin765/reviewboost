import { createHmac, timingSafeEqual } from "crypto";
import { findUserIdByPaddleCustomerId, upsertProfileCustomer, upsertSubscription } from "@/lib/billing";
import { paddlePlanForPriceId } from "@/lib/paddle";

export const runtime = "nodejs";

function getWebhookSecret() {
  const v = process.env.PADDLE_WEBHOOK_SECRET;
  if (!v) throw new Error("PADDLE_WEBHOOK_SECRET is not set");
  return v;
}

function parsePaddleSignature(sigHeader: string | null) {
  const header = String(sigHeader ?? "").replace(/;/g, ",");
  const parts = header
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const ts = parts.find((p) => p.startsWith("ts="))?.slice(3) ?? "";
  const h1 = parts.find((p) => p.startsWith("h1="))?.slice(3) ?? "";
  if (!ts || !h1) return null;
  return { ts, h1 };
}

function verifySignature(payload: string, sigHeader: string | null): boolean {
  const parsed = parsePaddleSignature(sigHeader);
  if (!parsed) return false;

  const signedPayload = `${parsed.ts}:${payload}`;
  const digest = createHmac("sha256", getWebhookSecret()).update(signedPayload, "utf8").digest("hex");

  const a = Buffer.from(digest, "utf8");
  const b = Buffer.from(parsed.h1, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function extractPriceIdFromSubscription(subscription: any): string | null {
  return (
    subscription?.items?.[0]?.price?.id ?? subscription?.items?.[0]?.price_id ?? subscription?.items?.data?.[0]?.price?.id ?? null
  );
}

function extractCustomerId(data: any): string | null {
  const id = data?.customer_id ?? data?.customer?.id ?? data?.customer;
  const v = String(id ?? "").trim();
  return v || null;
}

function extractUserId(data: any): string | null {
  const v = String(data?.custom_data?.user_id ?? data?.metadata?.user_id ?? "").trim();
  return v || null;
}

async function handleSubscriptionEvent(subscription: any) {
  const paddleSubscriptionId = String(subscription?.id ?? "").trim();
  const paddleCustomerId = extractCustomerId(subscription);
  if (!paddleSubscriptionId || !paddleCustomerId) return;

  const status = String(subscription?.status ?? "");
  const metadataUserId = extractUserId(subscription);
  const mappedUserId = metadataUserId ?? (await findUserIdByPaddleCustomerId(paddleCustomerId));
  if (!mappedUserId) return;

  await upsertProfileCustomer(mappedUserId, paddleCustomerId);

  const priceId = extractPriceIdFromSubscription(subscription);
  const planTier = paddlePlanForPriceId(priceId);

  await upsertSubscription({
    userId: mappedUserId,
    paddleSubscriptionId,
    paddleCustomerId,
    paddlePriceId: priceId,
    status,
    planTier,
    currentPeriodStart: subscription?.current_billing_period?.starts_at ?? null,
    currentPeriodEnd: subscription?.current_billing_period?.ends_at ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.scheduled_change?.action === "cancel")
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  try {
    if (!verifySignature(rawBody, signature)) {
      return Response.json({ error: "invalid signature" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "webhook secret missing" }, { status: 500 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const type = String(event?.event_type ?? "");
    const data = event?.data;

    if (type === "transaction.completed") {
      const userId = extractUserId(data);
      const customerId = extractCustomerId(data);
      if (userId && customerId) {
        await upsertProfileCustomer(userId, customerId);
      }
    }

    if (
      type === "subscription.created" ||
      type === "subscription.updated" ||
      type === "subscription.canceled" ||
      type === "subscription.paused" ||
      type === "subscription.resumed"
    ) {
      await handleSubscriptionEvent(data);
    }
  } catch (e: any) {
    return Response.json({ error: e?.message ?? "webhook handling failed" }, { status: 500 });
  }

  return Response.json({ received: true });
}
