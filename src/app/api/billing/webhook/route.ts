import {
  findUserIdByPaddleCustomerId,
  upsertPendingSubscription,
  upsertProfileCustomer,
  upsertSubscription
} from "@/lib/billing";
import { findUserIdByEmail } from "@/lib/clerk_bridge";
import { recordFunnelEvent, recordFunnelEventOnce } from "@/lib/db/queries";
import { fetchPaddleCustomerEmail, paddlePlanForPriceId } from "@/lib/paddle";
import {
  extractCustomerEmail,
  extractCustomerId,
  extractUserId,
  normalizeSubscriptionPayload,
  verifyPaddleSignature
} from "@/lib/paddleWebhook";

export const runtime = "nodejs";

/**
 * 웹훅 서명 검증에 쓸 시크릿 목록.
 * PADDLE_WEBHOOK_SECRET(단일) + PADDLE_WEBHOOK_SECRETS(콤마 구분)를 합쳐 중복 제거한다.
 * Paddle 알림 destination 을 여러 개 쓰면 destination 마다 시크릿이 다르므로 모두 허용한다.
 */
function getWebhookSecrets(): string[] {
  const single = String(process.env.PADDLE_WEBHOOK_SECRET ?? "").trim();
  const many = String(process.env.PADDLE_WEBHOOK_SECRETS ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  const secrets = Array.from(new Set([single, ...many].filter(Boolean)));
  if (secrets.length === 0) {
    throw new Error("PADDLE_WEBHOOK_SECRET is not set");
  }
  return secrets;
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

/** 결제 완료 알림에 필요한 정보. 처리 실패/귀속 불가 시 null. */
type PaymentReceipt = {
  userId: string | null;
  customerId: string;
  customerEmail: string | null;
  planTier: string;
  subscriptionId: string;
  pending: boolean;
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

/**
 * 웹훅 처리 실패(매핑 실패/잘못된 페이로드/가격 미매핑) 보고.
 * ① 콘솔 경고 ② `funnel_events` 기록(event_id 로 재시도 dedupe) ③ 관리자 웹훅 알림(best-effort).
 * 결제는 완료됐는데 entitlement 가 저장되지 않는 사고를 조기에 감지하기 위함.
 */
async function reportWebhookFailure(args: {
  reason: string;
  eventType: string;
  eventId: string | null;
  customerId?: string | null;
  extra?: Record<string, unknown>;
}): Promise<void> {
  logWebhookWarning(args);

  await recordFunnelEvent(
    "billing_webhook_failed",
    null,
    {
      reason: args.reason,
      event_type: args.eventType,
      event_id: args.eventId,
      customer_id: args.customerId ?? null,
      ...(args.extra ?? {})
    },
    args.eventId ?? `${args.reason}:${args.customerId ?? "unknown"}`
  );

  const url = String(process.env.BILLING_ALERT_WEBHOOK_URL ?? "").trim();
  if (url) {
    await postAlert(url, {
      method: "POST",
      headers: { "content-type": "text/plain; charset=utf-8" },
      body: `[ReviewBoost] 결제 웹훅 실패: ${args.reason} (${args.eventType}, customer=${args.customerId ?? "?"})`
    });
  }

  const tgToken = String(
    process.env.BILLING_ALERT_TELEGRAM_BOT_TOKEN ?? process.env.TELEGRAM_BOT_TOKEN ?? ""
  ).trim();
  const tgChat = String(
    process.env.BILLING_ALERT_TELEGRAM_CHAT_ID ?? process.env.TELEGRAM_CHAT_ID ?? ""
  ).trim();
  if (tgToken && tgChat) {
    await postAlert(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: tgChat,
        text: `[ReviewBoost] 결제 웹훅 실패: ${args.reason}\n${args.eventType} · customer=${args.customerId ?? "?"}`,
        disable_web_page_preview: true
      })
    });
  }
}

/** 관리자 알림 전송(best-effort). 실패해도 웹훅 처리를 막지 않는다. */
async function postAlert(url: string, init: RequestInit): Promise<void> {
  try {
    await fetch(url, init);
  } catch {
    // ignore
  }
}

/** 결제 완료 알림용 텔레그램 자격증명. BILLING_NOTIFY_* → BILLING_ALERT_* → TELEGRAM_* 순으로 폴백. */
function billingNotifyTelegramCreds(): { token: string; chatId: string } | null {
  const token = String(
    process.env.BILLING_NOTIFY_TELEGRAM_BOT_TOKEN ??
      process.env.BILLING_ALERT_TELEGRAM_BOT_TOKEN ??
      process.env.TELEGRAM_BOT_TOKEN ??
      ""
  ).trim();
  const chatId = String(
    process.env.BILLING_NOTIFY_TELEGRAM_CHAT_ID ??
      process.env.BILLING_ALERT_TELEGRAM_CHAT_ID ??
      process.env.TELEGRAM_CHAT_ID ??
      ""
  ).trim();
  return token && chatId ? { token, chatId } : null;
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  "KRW",
  "JPY",
  "VND",
  "CLP",
  "ISK",
  "HUF",
  "TWD",
  "BIF",
  "DJF",
  "GNF",
  "KMF",
  "PYG",
  "RWF",
  "UGX",
  "VUV",
  "XAF",
  "XOF",
  "XPF"
]);

/** Paddle 금액(최소 단위)을 사람이 읽는 문자열로 변환. 알 수 없으면 null. */
function formatPaymentAmount(total: number | null, currency: string | null): string | null {
  if (total == null || !Number.isFinite(total)) return null;
  const code = String(currency ?? "").toUpperCase();
  const major = ZERO_DECIMAL_CURRENCIES.has(code) ? total : total / 100;
  if (!code) return major.toLocaleString("ko-KR");
  try {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency: code }).format(major);
  } catch {
    return `${major.toLocaleString("ko-KR")} ${code}`;
  }
}

function planLabel(tier: string): string {
  if (tier === "pro") return "Pro";
  if (tier === "basic") return "Basic";
  if (tier === "extension") return "익스텐션";
  return "Free/기타";
}

/** 알림에 표시할 상품/플랜 라벨. ReviewBoost 플랜이 아니면 price/product id 로 표기한다. */
function paymentProductLabel(
  planTier: string | null,
  priceId: string | null,
  productId: string | null
): string {
  if (planTier === "basic" || planTier === "pro" || planTier === "extension") {
    return planLabel(planTier);
  }
  const ref = productId ?? priceId;
  return ref ? `기타 상품(${ref})` : "알 수 없음";
}

/** Paddle transaction/order 페이로드에서 거래 ID를 뽑는다. order.completed 는 transaction_id 를 갖는다. */
function extractTransactionId(data: unknown, eventId: string | null): string | null {
  const record = asRecord(data);
  return asTrimmedString(record?.transaction_id) ?? asTrimmedString(record?.id) ?? eventId;
}

/** 결제 상품 ID 추출(items[0].product_id 또는 items[0].price.product_id). 외부 상품 식별용. */
function extractProductId(data: unknown): string | null {
  const record = asRecord(data);
  const items = Array.isArray(record?.items)
    ? record.items
    : Array.isArray(asRecord(record?.items)?.data)
      ? (asRecord(record?.items)?.data as unknown[])
      : [];
  const first = asRecord(items[0]);
  const price = asRecord(first?.price);
  return asTrimmedString(first?.product_id) ?? asTrimmedString(price?.product_id);
}

/**
 * ReviewBoost 결제인지 판별한다. 계정 공용(모든 상품) 알림을 받으므로, 외부 상품 결제에는
 * ReviewBoost entitlement/실패 알림을 적용하지 않도록 이 함수로 게이팅한다.
 * (= custom_data.plan_tier/user_id 가 있거나 가격 ID가 ReviewBoost 플랜에 매핑됨)
 */
function isReviewBoostTransaction(data: unknown): boolean {
  const record = asRecord(data);
  const customData = asRecord(record?.custom_data);
  if (asTrimmedString(customData?.user_id)) return true;
  const declaredPlan = asTrimmedString(customData?.plan_tier);
  if (declaredPlan === "basic" || declaredPlan === "pro" || declaredPlan === "extension") return true;
  return paddlePlanForPriceId(extractPriceId(data)) !== "free";
}

/** 결제 금액/통화 추출. Paddle 은 details.totals.total(최소 단위) + currency_code 로 준다. */
function extractPaymentTotals(data: unknown): { total: number | null; currency: string | null } {
  const record = asRecord(data);
  const details = asRecord(record?.details);
  const totals = asRecord(details?.totals);
  const raw = totals?.total ?? totals?.grand_total ?? details?.grand_total ?? record?.total;
  const parsed = raw != null && String(raw).trim() !== "" ? Number(raw) : null;
  const currency =
    asTrimmedString(record?.currency_code) ?? asTrimmedString(details?.currency_code) ?? null;
  return { total: parsed != null && Number.isFinite(parsed) ? parsed : null, currency };
}

/**
 * 새 결제 완료를 관리자 텔레그램으로 알린다. best-effort.
 * Paddle 계정의 모든 상품 결제를 대상으로 하며, ReviewBoost 로 귀속되지 않는
 * 외부 상품 결제라도 알림은 보낸다(managed=false).
 * 같은 거래(transaction id)에 대해 Paddle 이 재시도/중복 이벤트를 보내도
 * `recordFunnelEventOnce` 로 최초 1회만 발송한다.
 */
async function notifyPaymentReceived(args: {
  eventType: string;
  eventId: string | null;
  userId: string | null;
  customerId: string | null;
  customerEmail: string | null;
  planTier: string | null;
  priceId: string | null;
  productId: string | null;
  subscriptionId: string | null;
  transactionId: string | null;
  total: number | null;
  currency: string | null;
  managed: boolean;
  pending: boolean;
}): Promise<void> {
  const dedupeKey = `payment:${args.transactionId ?? args.subscriptionId ?? args.eventId ?? args.customerId ?? "unknown"}`;

  const fresh = await recordFunnelEventOnce(
    "billing_payment_received",
    args.userId,
    {
      event_type: args.eventType,
      event_id: args.eventId,
      paddle_subscription_id: args.subscriptionId,
      paddle_price_id: args.priceId,
      paddle_product_id: args.productId,
      customer_id: args.customerId,
      email: args.customerEmail,
      plan_tier: args.planTier,
      total: args.total,
      currency: args.currency,
      managed: args.managed,
      pending: args.pending
    },
    dedupeKey
  );
  // false = 이미 알림을 보낸 거래(재시도). null = DB 미구성/오류라 판별 불가 → 알림은 진행.
  if (fresh === false) return;

  const creds = billingNotifyTelegramCreds();
  if (!creds) return;

  const amount = formatPaymentAmount(args.total, args.currency);
  const customer = args.customerEmail ?? (args.userId ? `uid:${args.userId}` : "알 수 없음");
  const lines = [
    "[Paddle] 신규 결제",
    `상품: ${paymentProductLabel(args.planTier, args.priceId, args.productId)}`,
    amount ? `금액: ${amount}` : null,
    `고객: ${customer}`,
    `상태: ${args.managed ? (args.pending ? "계정 미연결(pending)" : "구독 반영 완료") : "외부 상품(구독 미관리)"}`,
    args.subscriptionId ? `구독: ${args.subscriptionId}` : null,
    args.transactionId ? `거래: ${args.transactionId}` : null
  ].filter((v): v is string => Boolean(v));

  await postAlert(`https://api.telegram.org/bot${creds.token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: creds.chatId,
      text: lines.join("\n"),
      disable_web_page_preview: true
    })
  });
}

/** 결제 이벤트(엔티틀먼트/외부 상품 공통)에서 텔레그램 알림 인자를 만든다. */
function buildPaymentNotification(args: {
  eventType: string;
  eventId: string | null;
  data: unknown;
  receipt: PaymentReceipt | null;
}) {
  const record = asRecord(args.data);
  const customData = asRecord(record?.custom_data);
  const priceId = extractPriceId(args.data);
  const planTier =
    args.receipt?.planTier ??
    asTrimmedString(customData?.plan_tier) ??
    paddlePlanForPriceId(priceId);

  return {
    eventType: args.eventType,
    eventId: args.eventId,
    userId: args.receipt?.userId ?? extractUserId(args.data),
    customerId: args.receipt?.customerId ?? extractCustomerId(args.data),
    customerEmail: args.receipt?.customerEmail ?? extractCustomerEmail(args.data),
    planTier,
    priceId,
    productId: extractProductId(args.data),
    subscriptionId: args.receipt?.subscriptionId ?? asTrimmedString(record?.subscription_id) ?? null,
    transactionId: extractTransactionId(args.data, args.eventId),
    ...extractPaymentTotals(args.data),
    managed: Boolean(args.receipt),
    pending: args.receipt?.pending ?? false
  };
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

async function handleEntitlementEvent(
  eventType: string,
  eventId: string | null,
  data: unknown
): Promise<PaymentReceipt | null> {
  const normalized = normalizeEntitlementPayload(data);
  if (!normalized) {
    await reportWebhookFailure({
      reason: "invalid_entitlement_payload",
      eventType,
      eventId,
      customerId: extractCustomerId(data)
    });
    return null;
  }

  // 게스트(비로그인) 결제 지원: custom_data.user_id → paddle 고객 매핑 → 이메일(Clerk) 순으로 사용자를 찾는다.
  // 사용자를 찾지 못하면(아직 계정 없음) pending_subscriptions 로 이메일 기준 보관해
  // 나중에 같은 이메일로 로그인하면 연결(claimPendingSubscriptionByEmail)한다.
  let mappedUserId = normalized.userId ?? (await findUserIdByPaddleCustomerId(normalized.customerId));
  let customerEmail = extractCustomerEmail(data);
  // 페이로드에 이메일이 없으면(예: customer_id 만 오는 게스트 결제) Paddle API로 보강한다.
  if (!mappedUserId && !customerEmail) {
    customerEmail = await fetchPaddleCustomerEmail(normalized.customerId);
  }
  if (!mappedUserId && customerEmail) {
    mappedUserId = await findUserIdByEmail(customerEmail);
  }

  const planTier = paddlePlanForPriceId(normalized.priceId);

  if (!mappedUserId) {
    if (customerEmail) {
      await upsertPendingSubscription({
        email: customerEmail,
        paddleSubscriptionId: normalized.id,
        paddleCustomerId: normalized.customerId,
        paddlePriceId: normalized.priceId,
        status: normalized.status,
        planTier,
        currentPeriodStart: normalized.currentPeriodStart,
        currentPeriodEnd: normalized.currentPeriodEnd,
        cancelAtPeriodEnd: normalized.cancelAtPeriodEnd
      });
      logWebhookWarning({
        reason: "pending_subscription_by_email",
        eventType,
        eventId,
        customerId: normalized.customerId,
        extra: { email: customerEmail }
      });
      if (planTier === "extension") {
        const transactionId = asTrimmedString(asRecord(data)?.id);
        await recordFunnelEvent(
          "extension_payment_completed",
          null,
          {
            event_type: eventType,
            event_id: eventId,
            paddle_subscription_id: normalized.id,
            email: customerEmail,
            pending: true
          },
          transactionId ?? eventId
        );
      }
      return {
        userId: null,
        customerId: normalized.customerId,
        customerEmail,
        planTier,
        subscriptionId: normalized.id,
        pending: true
      };
    }

    await reportWebhookFailure({
      reason: "user_mapping_missing",
      eventType,
      eventId,
      customerId: normalized.customerId
    });
    return null;
  }

  await upsertProfileCustomer(mappedUserId, normalized.customerId);

  if (normalized.priceId && planTier === "free") {
    await reportWebhookFailure({
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

  return {
    userId: mappedUserId,
    customerId: normalized.customerId,
    customerEmail,
    planTier,
    subscriptionId: normalized.id,
    pending: false
  };
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
    await reportWebhookFailure({
      reason: "invalid_subscription_payload",
      eventType,
      eventId,
      customerId: extractCustomerId(data)
    });
    return;
  }

  // 게스트(비로그인) 결제 지원: custom_data.user_id → paddle 고객 매핑 → 이메일(Clerk) 순으로 사용자를 찾는다.
  // 사용자를 찾지 못하면(아직 계정 없음) pending_subscriptions 로 이메일 기준 보관해
  // 나중에 같은 이메일로 로그인하면 연결(claimPendingSubscriptionByEmail)한다.
  let mappedUserId = normalized.userId ?? (await findUserIdByPaddleCustomerId(normalized.customerId));
  let customerEmail = extractCustomerEmail(data);
  // 페이로드에 이메일이 없으면(예: customer_id 만 오는 게스트 결제) Paddle API로 보강한다.
  if (!mappedUserId && !customerEmail) {
    customerEmail = await fetchPaddleCustomerEmail(normalized.customerId);
  }
  if (!mappedUserId && customerEmail) {
    mappedUserId = await findUserIdByEmail(customerEmail);
  }

  const planTier = paddlePlanForPriceId(normalized.priceId);

  if (!mappedUserId) {
    if (customerEmail) {
      await upsertPendingSubscription({
        email: customerEmail,
        paddleSubscriptionId: normalized.id,
        paddleCustomerId: normalized.customerId,
        paddlePriceId: normalized.priceId,
        status: normalized.status,
        planTier,
        currentPeriodStart: normalized.currentPeriodStart,
        currentPeriodEnd: normalized.currentPeriodEnd,
        cancelAtPeriodEnd: normalized.cancelAtPeriodEnd
      });
      logWebhookWarning({
        reason: "pending_subscription_by_email",
        eventType,
        eventId,
        customerId: normalized.customerId,
        extra: { email: customerEmail }
      });
      if (planTier === "extension") {
        const transactionId = asTrimmedString(asRecord(data)?.id);
        await recordFunnelEvent(
          "extension_payment_completed",
          null,
          {
            event_type: eventType,
            event_id: eventId,
            paddle_subscription_id: normalized.id,
            email: customerEmail,
            pending: true
          },
          transactionId ?? eventId
        );
      }
    } else {
      await reportWebhookFailure({
        reason: "user_mapping_missing",
        eventType,
        eventId,
        customerId: normalized.customerId
      });
    }
    return;
  }

  await upsertProfileCustomer(mappedUserId, normalized.customerId);

  if (normalized.priceId && planTier === "free") {
    await reportWebhookFailure({
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
    const secrets = getWebhookSecrets();
    if (!secrets.some((secret) => verifyPaddleSignature(rawBody, signature, secret))) {
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

    if (type === "transaction.completed" || type === "order.completed" || type === "transaction.paid") {
      // 계정 공용 알림: ReviewBoost 결제가 아니어도(외부 상품) 모든 결제 완료를 알린다.
      // ReviewBoost entitlement/실패 알림은 ReviewBoost 거래에만 적용해 외부 상품의
      // pending 오염/실패 알림 스팸을 막는다.
      const receipt = isReviewBoostTransaction(data)
        ? await handleEntitlementEvent(type, eventId, data)
        : null;
      await notifyPaymentReceived(buildPaymentNotification({ eventType: type, eventId, data, receipt }));
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
