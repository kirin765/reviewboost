import { createHmac, timingSafeEqual } from "crypto";

export type PaddleSignature = {
  ts: string;
  h1: string;
};

export type NormalizedSubscription = {
  id: string;
  customerId: string;
  status: string;
  userId: string | null;
  priceId: string | null;
  currentPeriodStart: string | number | null;
  currentPeriodEnd: string | number | null;
  cancelAtPeriodEnd: boolean;
};

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

function asTrimmedString(value: unknown): string | null {
  const v = String(value ?? "").trim();
  return v || null;
}

export function parsePaddleSignature(sigHeader: string | null): PaddleSignature | null {
  const header = String(sigHeader ?? "").replace(/;/g, ",");
  const parts = header
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const ts = asTrimmedString(parts.find((p) => p.startsWith("ts="))?.slice(3));
  const h1 = asTrimmedString(parts.find((p) => p.startsWith("h1="))?.slice(3));
  if (!ts || !h1) return null;
  return { ts, h1 };
}

const DEFAULT_WEBHOOK_TOLERANCE_SECONDS = 300;

export function paddleWebhookToleranceSeconds(): number {
  const raw = Number(process.env.PADDLE_WEBHOOK_TOLERANCE_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_WEBHOOK_TOLERANCE_SECONDS;
}

export function verifyPaddleSignature(
  rawBody: string,
  sigHeader: string | null,
  secret: string,
  opts: { toleranceSeconds?: number; nowMs?: number } = {}
): boolean {
  const parsed = parsePaddleSignature(sigHeader);
  if (!parsed) return false;

  // Replay protection: reject signatures whose timestamp is outside the tolerance
  // window. Pass toleranceSeconds = Infinity to skip (used only in pure-HMAC tests).
  const tolerance = opts.toleranceSeconds ?? paddleWebhookToleranceSeconds();
  if (Number.isFinite(tolerance)) {
    const tsSeconds = Number(parsed.ts);
    if (!Number.isFinite(tsSeconds)) return false;
    const nowMs = opts.nowMs ?? Date.now();
    if (Math.abs(nowMs - tsSeconds * 1000) > tolerance * 1000) return false;
  }

  const signedPayload = `${parsed.ts}:${rawBody}`;
  const digest = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");

  const expected = Buffer.from(digest, "utf8");
  const incoming = Buffer.from(parsed.h1, "utf8");
  if (expected.length !== incoming.length) return false;
  return timingSafeEqual(expected, incoming);
}

export function extractCustomerId(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;

  const customer = asRecord(record.customer);
  return (
    asTrimmedString(record.customer_id) ??
    asTrimmedString(customer?.id) ??
    asTrimmedString(record.customer)
  );
}

/** 게스트 결제 구독을 이메일로 연결하기 위한 고객 이메일 (소문자). */
export function extractCustomerEmail(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;

  const customer = asRecord(record.customer);
  const email =
    asTrimmedString(customer?.email_address) ??
    asTrimmedString(record.customer_email) ??
    asTrimmedString(record.email);
  return email ? email.toLowerCase() : null;
}

export function extractUserId(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;

  const customData = asRecord(record.custom_data);
  const metadata = asRecord(record.metadata);
  return asTrimmedString(customData?.user_id) ?? asTrimmedString(metadata?.user_id);
}

export function extractPriceId(data: unknown): string | null {
  const record = asRecord(data);
  if (!record) return null;

  const items = asRecord(record.items);
  const entries = Array.isArray(record.items)
    ? record.items
    : Array.isArray(items?.data)
      ? items.data
      : [];
  const first = asRecord(entries[0]);
  const firstPrice = asRecord(first?.price);

  return asTrimmedString(firstPrice?.id) ?? asTrimmedString(first?.price_id);
}

export function normalizeSubscriptionPayload(data: unknown): NormalizedSubscription | null {
  const record = asRecord(data);
  if (!record) return null;

  const id = asTrimmedString(record.id);
  const customerId = extractCustomerId(record);
  if (!id || !customerId) return null;

  const currentBillingPeriod = asRecord(record.current_billing_period);
  const scheduledChange = asRecord(record.scheduled_change);

  return {
    id,
    customerId,
    status: String(record.status ?? ""),
    userId: extractUserId(record),
    priceId: extractPriceId(record),
    currentPeriodStart: (currentBillingPeriod?.starts_at as string | number | null | undefined) ?? null,
    currentPeriodEnd: (currentBillingPeriod?.ends_at as string | number | null | undefined) ?? null,
    cancelAtPeriodEnd: String(scheduledChange?.action ?? "").trim() === "cancel"
  };
}
