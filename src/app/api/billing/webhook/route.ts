import { createHmac, timingSafeEqual } from "crypto";
import { findUserIdByPaddleCustomerId, upsertProfileCustomer, upsertSubscription } from "@/lib/billing";
import { paddlePlanForPriceId } from "@/lib/paddle";
import { logApiError } from "@/lib/api_log";

export const runtime = "nodejs";

function debugWebhookLog(message: string) {
  if (process.env.NODE_ENV === "test") return;
  console.log(`[billing/webhook] ${message}`);
}

function getWebhookSecret() {
  const value = String(process.env.PADDLE_WEBHOOK_SECRET ?? "").trim();
  if (!value) {
    throw new Error("PADDLE_WEBHOOK_SECRET is not set");
  }
  return value;
}

function parsePaddleSignature(signatureHeader: string | null) {
  const header = String(signatureHeader ?? "").replace(/;/g, ",");
  const parts = header
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const ts = parts.find((part) => part.startsWith("ts="))?.slice(3) ?? "";
  const h1 = parts.find((part) => part.startsWith("h1="))?.slice(3) ?? "";

  if (!/^[0-9]+$/.test(ts) || !/^[a-f0-9]{64}$/i.test(h1)) {
    return null;
  }

  return {
    ts,
    h1: h1.toLowerCase()
  };
}

function verifyWebhookSignature(payload: string, signatureHeader: string | null): boolean {
  const parsed = parsePaddleSignature(signatureHeader);
  if (!parsed) return false;

  const secret = getWebhookSecret();
  const expected = createHmac("sha256", secret).update(`${parsed.ts}:${payload}`, "utf8").digest("hex");
  const expectedBytes = Buffer.from(expected, "hex");
  const actualBytes = Buffer.from(parsed.h1, "hex");

  if (expectedBytes.length !== actualBytes.length || expectedBytes.length === 0) {
    return false;
  }

  return timingSafeEqual(expectedBytes, actualBytes);
}

function extractCustomerId(data: unknown): string | null {
  const raw = data as {
    customer_id?: string;
    customer?: {
      id?: string;
    } | string | null;
  };

  const value = String(
    raw?.customer_id ??
      (typeof raw?.customer === "string" ? raw.customer : raw?.customer?.id) ??
      ""
  ).trim();

  return value || null;
}

async function logSkipReason(request: Request, eventType: string, reason: string) {
  debugWebhookLog(`skip: eventType=${eventType}, reason=${reason}`);
  await logApiError({
    route: "/api/billing/webhook",
    method: request.method,
    status: 200,
    code: "webhook_payload_skip",
    message: "웹훅 이벤트 처리 건너뛰기",
    details: reason,
    request,
    extra: { eventType }
  });
}

type BillingItem = {
  price?: { id?: string };
  price_id?: string;
};

type BillingPeriod = {
  starts_at?: string;
  ends_at?: string;
};

type RawBillingPeriod = {
  [key: string]: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  start?: unknown;
  end?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  start_time?: unknown;
  end_time?: unknown;
};

type BillingPeriodCarrier = {
  current_billing_period?: RawBillingPeriod | null;
  billing_period?: RawBillingPeriod | null;
  current_period?: RawBillingPeriod | null;
  period?: RawBillingPeriod | null;
  current_billing_period_starts_at?: unknown;
  current_billing_period_ends_at?: unknown;
  starts_at?: unknown;
  ends_at?: unknown;
  start_at?: unknown;
  end_at?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  start_time?: unknown;
  end_time?: unknown;
};

type SubscriptionData = {
  id?: string;
  customer_id?: string;
  customer?: { id?: string };
  status?: string;
  custom_data?: { user_id?: string; [key: string]: unknown };
  metadata?: { user_id?: string; [key: string]: unknown };
  items?: BillingItem[];
  current_billing_period?: {
    starts_at?: string;
    ends_at?: string;
  };
  scheduled_change?: {
    action?: string;
  };
};

type TransactionData = {
  id?: string;
  customer_id?: string;
  customer?: { id?: string };
  subscription_id?: string;
  status?: string;
  custom_data?: { user_id?: string; [key: string]: unknown };
  metadata?: { user_id?: string; [key: string]: unknown };
  items?: BillingItem[];
  current_billing_period?: BillingPeriod;
  subscription?: {
    id?: string;
    status?: string;
    current_billing_period?: BillingPeriod;
  };
};

function readDateValue(record: unknown, keys: string[]): string {
  if (!record || typeof record !== "object") return "";
  const raw = record as Record<string, unknown>;

  for (const key of keys) {
    const value = raw[key];
    const normalized = String(value ?? "").trim();
    if (normalized) return normalized;
  }

  return "";
}

function resolvePeriodFromCarrier(periodData: unknown): BillingPeriod | null {
  if (!periodData || typeof periodData !== "object") return null;
  const startsAt = readDateValue(periodData, [
    "starts_at",
    "start_at",
    "startsAt",
    "start",
    "startTime",
    "start_time"
  ]);
  const endsAt = readDateValue(periodData, [
    "ends_at",
    "end_at",
    "endsAt",
    "end",
    "endTime",
    "end_time"
  ]);

  if (!startsAt && !endsAt) return null;

  return {
    starts_at: startsAt || undefined,
    ends_at: endsAt || undefined
  };
}

function resolveCurrentBillingPeriod(periodData?: BillingPeriodCarrier | null): BillingPeriod | null {
  const data = periodData as BillingPeriodCarrier | null | undefined;

  const direct = resolvePeriodFromCarrier(data);
  if (direct) return direct;

  const candidates = [
    data?.current_billing_period,
    data?.billing_period,
    data?.current_period,
    data?.period
  ] as unknown[];

  for (const candidate of candidates) {
    const resolved = resolvePeriodFromCarrier(candidate);
    if (resolved) return resolved;
  }

  const startsAt = readDateValue(data, [
    "current_billing_period_starts_at",
    "starts_at",
    "start_at",
    "startsAt",
    "start",
    "start_time"
  ]);
  const endsAt = readDateValue(data, [
    "current_billing_period_ends_at",
    "ends_at",
    "end_at",
    "endsAt",
    "end",
    "end_time"
  ]);

  if (!startsAt && !endsAt) return null;

  return {
    starts_at: startsAt || undefined,
    ends_at: endsAt || undefined
  };
}

function extractUserId(data: unknown): string | null {
  const value = String(
    (data as { custom_data?: { user_id?: string }; metadata?: { user_id?: string } }).custom_data?.user_id ??
      (data as { metadata?: { user_id?: string } }).metadata?.user_id ??
      ""
  ).trim();

  return value || null;
}

function extractPriceId(data: { items?: BillingItem[] } | null | undefined): string | null {
  const value = String(data?.items?.[0]?.price?.id ?? data?.items?.[0]?.price_id ?? "").trim();
  return value || null;
}

function extractSubscriptionId(data: unknown): string | null {
  const value = String(
    (data as TransactionData).subscription_id ?? (data as TransactionData).subscription?.id ?? ""
  ).trim();
  return value || null;
}

async function handleTransactionCompleted(request: Request, data: unknown, eventType: string) {
  const transaction = data as TransactionData;
  const customerId = extractCustomerId(transaction);
  if (!customerId) {
    debugWebhookLog(`transaction event missing customer_id, eventType=${eventType}`);
    await logSkipReason(request, eventType, "missing customer_id/customer in transaction payload");
    return;
  }

  const userId = extractUserId(transaction) || (await findUserIdByPaddleCustomerId(customerId));
  if (!userId) {
    debugWebhookLog(`transaction event missing user mapping, eventType=${eventType}, customer_id=${customerId}`);
    await logSkipReason(request, eventType, `user_id not found for customer_id=${customerId}`);
    return;
  }

  await upsertProfileCustomer(userId, customerId);

  if (eventType !== "transaction.completed" && eventType !== "order.completed") {
    return;
  }

  const subscriptionId = extractSubscriptionId(transaction);
  if (!subscriptionId) {
    debugWebhookLog(`transaction event missing subscription_id, eventType=${eventType}, customer_id=${customerId}`);
    await logSkipReason(request, eventType, "missing subscription_id in transaction payload");
    return;
  }

  const priceId = extractPriceId(transaction);
  const planTier = paddlePlanForPriceId(priceId);
  const status = String(transaction?.subscription?.status ?? transaction?.status ?? "active").trim() || "active";
  const currentBillingPeriod =
    resolveCurrentBillingPeriod(transaction) ??
    resolveCurrentBillingPeriod(transaction?.subscription ?? null);

  await upsertSubscription({
    userId,
    paddleSubscriptionId: subscriptionId,
    paddleCustomerId: customerId,
    paddlePriceId: priceId,
    status,
    planTier,
    currentPeriodStart: currentBillingPeriod?.starts_at ?? null,
    currentPeriodEnd: currentBillingPeriod?.ends_at ?? null,
    cancelAtPeriodEnd: false
  });

  debugWebhookLog(`upserted subscription from transaction: eventType=${eventType}, subscription_id=${subscriptionId}, customer_id=${customerId}, user_id=${userId}`);
}

async function handleSubscriptionEvent(request: Request, data: unknown) {
  const subscription = data as SubscriptionData;
  const subscriptionId = String(subscription?.id ?? "").trim();
  const customerId = extractCustomerId(subscription);

  if (!subscriptionId || !customerId) {
    await logSkipReason(
      request,
      `subscription.${subscription?.status ?? "unknown"}`,
      `missing subscription id or customer id (subscription_id=${subscriptionId || "missing"}, customer_id=${customerId || "missing"})`
    );
    return;
  }

  const status = String(subscription?.status ?? "").trim();
  const userId = extractUserId(subscription) || (await findUserIdByPaddleCustomerId(customerId));
  if (!userId) {
    debugWebhookLog(`subscription event missing user mapping, status=${subscription?.status ?? "unknown"}, customer_id=${customerId}`);
    await logSkipReason(
      request,
      `subscription.${subscription?.status ?? "unknown"}`,
      `user_id not found for customer_id=${customerId}`
    );
    return;
  }

  await upsertProfileCustomer(userId, customerId);

  const priceId = extractPriceId(subscription);
  const planTier = paddlePlanForPriceId(priceId);
  const currentBillingPeriod = resolveCurrentBillingPeriod(subscription);

  await upsertSubscription({
    userId,
    paddleSubscriptionId: subscriptionId,
    paddleCustomerId: customerId,
    paddlePriceId: priceId,
    status,
    planTier,
    currentPeriodStart: currentBillingPeriod?.starts_at ?? null,
    currentPeriodEnd: currentBillingPeriod?.ends_at ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.scheduled_change?.action === "cancel")
  });

  debugWebhookLog(
    `upserted subscription from subscription event: status=${status || "unknown"}, subscription_id=${subscriptionId}, customer_id=${customerId}, user_id=${userId}`
  );
}

const KNOWN_TRANSACTION_EVENTS = new Set([
  "transaction.created",
  "transaction.updated",
  "transaction.paid",
  "transaction.completed",
  "transaction.failed",
  "order.completed"
]);
const KNOWN_SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.activated",
  "subscription.updated",
  "subscription.canceled",
  "subscription.trialing",
  "subscription.paused",
  "subscription.resumed",
  "subscription.cancelled",
  "subscription.past_due"
]);

export async function POST(request: Request) {
  let bodyText = "";
  const method = request.method;

  debugWebhookLog(`incoming request method=${method} path=${new URL(request.url).pathname}`);

  try {
    bodyText = await request.text();
    const signature = request.headers.get("paddle-signature");
    debugWebhookLog(`signature header present=${Boolean(signature)}`);

    try {
      const verified = verifyWebhookSignature(bodyText, signature);
      if (!verified) {
        await logApiError({
          route: "/api/billing/webhook",
          method,
          status: 400,
          code: "INTERNAL_ERROR",
          message: "웹훅 서명 검증에 실패했습니다.",
          details: "invalid signature",
          request,
          extra: { signatureHeader: signature || "missing" }
        });
        return Response.json({ error: "invalid signature" }, { status: 400 });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "PADDLE_WEBHOOK_SECRET is not set") {
        await logApiError({
          route: "/api/billing/webhook",
          method,
          status: 500,
          code: "INTERNAL_ERROR",
          message: "웹훅 시크릿이 설정되지 않았습니다.",
          details: message,
          request,
          error
        });
        return Response.json({ error: "webhook secret missing" }, { status: 500 });
      }
      await logApiError({
        route: "/api/billing/webhook",
        method,
        status: 400,
        code: "INTERNAL_ERROR",
        message: "웹훅 서명 처리 중 오류가 발생했습니다.",
        details: message,
        request,
        error
      });
      console.error("Webhook signature check failed:", error);
      return Response.json({ error: "invalid signature" }, { status: 400 });
    }

    const payload = JSON.parse(bodyText);
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      await logApiError({
        route: "/api/billing/webhook",
        method,
        status: 400,
        code: "INTERNAL_ERROR",
        message: "웹훅 페이로드 형식이 유효하지 않습니다.",
        details: "payload must be a non-array object",
        request
      });
      return Response.json({ error: "invalid payload" }, { status: 400 });
    }

    const eventType = String((payload as { event_type?: string }).event_type ?? "").trim();
    debugWebhookLog(`payload parsed event_type=${eventType || "empty"}`);
    const data = (payload as { data?: unknown }).data;

    if (KNOWN_TRANSACTION_EVENTS.has(eventType)) {
      await handleTransactionCompleted(request, data, eventType);
      return Response.json({ received: true });
    }

    if (KNOWN_SUBSCRIPTION_EVENTS.has(eventType)) {
      await handleSubscriptionEvent(request, data);
      return Response.json({ received: true });
    }

    debugWebhookLog(`ignored unknown event_type=${eventType || "empty"}`);
    await logApiError({
      route: "/api/billing/webhook",
      method,
      status: 200,
      code: "webhook_payload_skip",
      message: "알 수 없는 이벤트 타입",
      details: `unhandled event_type=${eventType}`,
      request,
      extra: {
        payloadType: eventType ? "known" : "empty"
      }
    });

    return Response.json({ received: true, ignored: true });
  } catch (error) {
    await logApiError({
      route: "/api/billing/webhook",
      method,
      status: 500,
      code: "INTERNAL_ERROR",
      message: "웹훅 처리 중 오류가 발생했습니다.",
      details: error instanceof Error ? error.message : String(error ?? "unknown"),
      request,
      error
    });
    console.error("Webhook error:", error);
    return Response.json({ error: "webhook processing failed" }, { status: 500 });
  }
}
