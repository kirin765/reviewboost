import { createHmac, timingSafeEqual } from "crypto";
import { findUserIdByPaddleCustomerId, upsertProfileCustomer, upsertSubscription } from "@/lib/billing";
import { paddlePlanForPriceId } from "@/lib/paddle";
import { logApiError } from "@/lib/api_log";

export const runtime = "nodejs";

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

type BillingItem = {
  price?: { id?: string };
  price_id?: string;
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
  subscription?: { id?: string; status?: string };
  status?: string;
  custom_data?: { user_id?: string; [key: string]: unknown };
  metadata?: { user_id?: string; [key: string]: unknown };
  items?: BillingItem[];
};

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

async function handleTransactionCompleted(data: unknown, eventType: string) {
  const transaction = data as TransactionData;
  const customerId = extractCustomerId(transaction);
  if (!customerId) return;

  const userId = extractUserId(transaction) || (await findUserIdByPaddleCustomerId(customerId));
  if (!userId) return;

  await upsertProfileCustomer(userId, customerId);

  if (eventType !== "transaction.completed" && eventType !== "order.completed") {
    return;
  }

  const subscriptionId = extractSubscriptionId(transaction);
  if (!subscriptionId) return;

  const priceId = extractPriceId(transaction);
  const planTier = paddlePlanForPriceId(priceId);
  const status = String(transaction?.subscription?.status ?? transaction?.status ?? "active").trim() || "active";

  await upsertSubscription({
    userId,
    paddleSubscriptionId: subscriptionId,
    paddleCustomerId: customerId,
    paddlePriceId: priceId,
    status,
    planTier,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false
  });
}

async function handleSubscriptionEvent(data: unknown) {
  const subscription = data as SubscriptionData;
  const subscriptionId = String(subscription?.id ?? "").trim();
  const customerId = extractCustomerId(subscription);

  if (!subscriptionId || !customerId) return;

  const status = String(subscription?.status ?? "").trim();
  const userId = extractUserId(subscription) || (await findUserIdByPaddleCustomerId(customerId));
  if (!userId) return;

  await upsertProfileCustomer(userId, customerId);

  const priceId = extractPriceId(subscription);
  const planTier = paddlePlanForPriceId(priceId);

  await upsertSubscription({
    userId,
    paddleSubscriptionId: subscriptionId,
    paddleCustomerId: customerId,
    paddlePriceId: priceId,
    status,
    planTier,
    currentPeriodStart: subscription?.current_billing_period?.starts_at ?? null,
    currentPeriodEnd: subscription?.current_billing_period?.ends_at ?? null,
    cancelAtPeriodEnd: Boolean(subscription?.scheduled_change?.action === "cancel")
  });
}

const KNOWN_TRANSACTION_EVENTS = new Set([
  "transaction.completed",
  "transaction.updated",
  "transaction.failed",
  "order.completed"
]);
const KNOWN_SUBSCRIPTION_EVENTS = new Set([
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "subscription.trialing",
  "subscription.paused",
  "subscription.resumed"
]);

export async function POST(request: Request) {
  let bodyText = "";
  const method = request.method;

  try {
    bodyText = await request.text();
    const signature = request.headers.get("paddle-signature");

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
    const data = (payload as { data?: unknown }).data;

    if (KNOWN_TRANSACTION_EVENTS.has(eventType)) {
      await handleTransactionCompleted(data, eventType);
      return Response.json({ received: true });
    }

    if (KNOWN_SUBSCRIPTION_EVENTS.has(eventType)) {
      await handleSubscriptionEvent(data);
      return Response.json({ received: true });
    }

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
