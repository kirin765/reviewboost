import { findUserIdByPaddleCustomerId, upsertProfileCustomer, upsertSubscription } from "@/lib/billing";
import { recordFunnelEvent } from "@/lib/db/queries";
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

type NormalizedEntitlement = {
  id: string;
  customerId: string;
  userId: string | null;
  priceId: string | null;
  status: string;
  currentPeriodStart: string | number | null;
  currentPeriodEnd: string | number | null;
  cancelAtPeriodEnd: boolean;
};

function toWebhookEvent(payload: unknown): WebhookEvent | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  return payload as WebhookEvent;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asTrimmedString(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized || null;
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

function extractPriceId(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;

  const items = Array.isArray(record.items)
    ? record.items
    : Array.isArray(asRecord(record.items)?.data)
      ? (asRecord(record.items)?.data as unknown[])
      : [];
  const first = asRecord(items[0]);
  const price = asRecord(first?.price);

  return asTrimmedString(price?.id) ?? asTrimmedString(first?.price_id);
}

function normalizeEntitlementPayload(data: unknown): NormalizedEntitlement | null {
  const record = asRecord(data);
  if (!record) return null;

  const subscription = asRecord(record.subscription);
  const subscriptionBillingPeriod = asRecord(subscription?.current_billing_period);
  const rootBillingPeriod = asRecord(record.billing_period);

  const id = asTrimmedString(record.subscription_id) ?? asTrimmedString(subscription?.id);
  const customerId = extractCustomerId(record);

  if (!id || !customerId) return null;

  return {
    id,
    customerId,
    userId: extractUserId(record),
    priceId: extractPriceId(record),
    status: String(record.status ?? subscription?.status ?? "active"),
    currentPeriodStart: (subscriptionBillingPeriod?.starts_at as string | number | null | undefined) ?? (rootBillingPeriod?.starts_at as string | number | null | undefined) ?? null,
    currentPeriodEnd: (subscriptionBillingPeriod?.ends_at as string | number | null | undefined) ?? (rootBillingPeriod?.ends_at as string | number | null | undefined) ?? null,
    cancelAtPeriodEnd: false
  };
}

async function handleEntitlementEvent(eventType: string, eventId: string | null, data: unknown) {
  const normalized = normalizeEntitlementPayload(data);
  if (!normalized) {
    logWebhookWarning({
      reason: "invalid_entitlement_payload",
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

  // 퍼널 ③: 결제 완료. 결제 착지 이벤트(transaction/order.completed)에서만 세어
  // subscription.* 이벤트와의 중복 집계를 피한다. dedupe_key(transaction id,
  // 없으면 event_id)로 Paddle 웹훅 재시도의 이중 기록을 막는다.
  if (planTier === "extension") {
    const transactionId = asTrimmedString(asRecord(data)?.id);
    await recordFunnelEvent(
      "extension_payment_completed",
      mappedUserId,
      {
        event_type: eventType,
        event_id: eventId,
        paddle_subscription_id: normalized.id
      },
      transactionId ?? eventId
    );
  }
}

async function handleCustomerMappingEvent(eventType: string, eventId: string | null, data: unknown) {
  const userId = extractUserId(data);
  const customerId = extractCustomerId(data);
  if (userId && customerId) {
    await upsertProfileCustomer(userId, customerId);
    return;
  }

  logWebhookWarning({
    reason: "transaction_mapping_missing",
    eventType,
    eventId,
    customerId
  });
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

    if (type === "transaction.completed" || type === "order.completed") {
      await handleEntitlementEvent(type, eventId, data);
    } else if (type === "transaction.updated") {
      await handleCustomerMappingEvent(type, eventId, data);
    } else if (
      type === "subscription.activated" ||
      type === "subscription.created" ||
      type === "subscription.updated" ||
      type === "subscription.canceled" ||
      type === "subscription.paused" ||
      type === "subscription.resumed"
    ) {
      await handleSubscriptionEvent(type, eventId, data);
    } else {
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
