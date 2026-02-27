import { findUserIdByPaddleCustomerId, upsertProfileCustomer, upsertSubscription } from "@/lib/billing";
import { paddlePlanForPriceId } from "@/lib/paddle";
import {
  extractCustomerId,
  extractUserId,
  normalizeSubscriptionPayload,
  verifyPaddleSignature
} from "@/lib/paddleWebhook";

export const runtime = "nodejs";

function getWebhookSecret() {
  const v = process.env.PADDLE_WEBHOOK_SECRET;
  if (!v) throw new Error("PADDLE_WEBHOOK_SECRET is not set");
  return v;
}

type WebhookEvent = {
  event_id?: unknown;
  event_type?: unknown;
  data?: unknown;
};

function toWebhookEvent(payload: unknown): WebhookEvent | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as WebhookEvent;
}

function logWebhookWarning(args: {
  reason: string;
  eventType: string;
  eventId: string | null;
  customerId?: string | null;
  extra?: Record<string, unknown>;
}) {
  console.warn(
    "[billing-webhook]",
    JSON.stringify({
      reason: args.reason,
      event_type: args.eventType,
      event_id: args.eventId,
      customer_id: args.customerId ?? null,
      ...(args.extra ?? {})
    })
  );
}

async function handleSubscriptionEvent(eventType: string, eventId: string | null, data: unknown) {
  const normalized = normalizeSubscriptionPayload(data);
  if (!normalized) {
    logWebhookWarning({
      reason: "invalid_subscription_payload",
      eventType,
      eventId,
      customerId: extractCustomerId(data)
    });
    return;
  }

  const mappedUserId = normalized.userId ?? (await findUserIdByPaddleCustomerId(normalized.customerId));
  if (!mappedUserId) {
    logWebhookWarning({
      reason: "user_mapping_missing",
      eventType,
      eventId,
      customerId: normalized.customerId
    });
    return;
  }

  await upsertProfileCustomer(mappedUserId, normalized.customerId);

  const planTier = paddlePlanForPriceId(normalized.priceId);
  if (normalized.priceId && planTier === "free") {
    logWebhookWarning({
      reason: "unknown_price_id",
      eventType,
      eventId,
      customerId: normalized.customerId,
      extra: { paddle_price_id: normalized.priceId }
    });
  }

  await upsertSubscription({
    userId: mappedUserId,
    paddleSubscriptionId: normalized.id,
    paddleCustomerId: normalized.customerId,
    paddlePriceId: normalized.priceId,
    status: normalized.status,
    planTier,
    currentPeriodStart: normalized.currentPeriodStart,
    currentPeriodEnd: normalized.currentPeriodEnd,
    cancelAtPeriodEnd: normalized.cancelAtPeriodEnd
  });
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("paddle-signature");

  try {
    const secret = getWebhookSecret();
    if (!verifyPaddleSignature(rawBody, signature, secret)) {
      return Response.json({ error: "invalid signature" }, { status: 400 });
    }
  } catch {
    return Response.json({ error: "webhook secret missing" }, { status: 500 });
  }

  let parsedEvent: unknown;
  try {
    parsedEvent = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  const event = toWebhookEvent(parsedEvent);
  if (!event) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const type = String(event?.event_type ?? "");
    const eventId = String(event?.event_id ?? "").trim() || null;
    const data = event.data;

    if (type === "transaction.completed") {
      const userId = extractUserId(data);
      const customerId = extractCustomerId(data);
      if (userId && customerId) {
        await upsertProfileCustomer(userId, customerId);
      } else {
        logWebhookWarning({
          reason: "transaction_mapping_missing",
          eventType: type,
          eventId,
          customerId
        });
      }
    }

    if (
      type === "subscription.created" ||
      type === "subscription.updated" ||
      type === "subscription.canceled" ||
      type === "subscription.paused" ||
      type === "subscription.resumed"
    ) {
      await handleSubscriptionEvent(type, eventId, data);
    } else if (type !== "transaction.completed") {
      logWebhookWarning({
        reason: "unsupported_event_type",
        eventType: type || "unknown",
        eventId,
        customerId: extractCustomerId(data)
      });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "webhook handling failed";
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ received: true });
}
