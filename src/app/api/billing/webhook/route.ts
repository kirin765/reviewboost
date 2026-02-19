import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifyWebhookSignature } from '@/lib/toss';
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

  const tsRaw = parts.find((p) => p.startsWith("ts="))?.slice(3) ?? "";
  const h1Raw = parts.find((p) => p.startsWith("h1="))?.slice(3) ?? "";
  const ts = tsRaw.trim();
  const h1 = h1Raw.trim().toLowerCase();

  if (!ts || !h1) return null;
  if (!/^\d+$/.test(ts)) return null;
  if (!/^[a-f0-9]{64}$/.test(h1)) return null;

  return { ts, h1 };
}

function verifySignature(payload: string, sigHeader: string | null): boolean {
  const parsed = parsePaddleSignature(sigHeader);
  if (!parsed) return false;

  const signedPayload = `${parsed.ts}:${payload}`;
  const digestHex = createHmac("sha256", getWebhookSecret()).update(signedPayload, "utf8").digest("hex");

  const expected = Buffer.from(digestHex, "hex");
  const actual = Buffer.from(parsed.h1, "hex");
  if (expected.length !== actual.length || expected.length === 0) return false;
  return timingSafeEqual(expected, actual);
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

export async function POST(request: Request) {
  try {
    const bodyText = await request.text();
    const signature = request.headers.get('x-toss-signature') || '';

    // Verify webhook signature
    try {
      if (!verifyWebhookSignature(bodyText, signature)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    } catch (err) {
      // If webhook secret not set, log and continue for development
      console.log('Webhook signature verification skipped:', err);
    }

    const event = JSON.parse(bodyText);
    const eventType = event.eventType;
    const data = event.data;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { get(name: string) { return cookieStore.get(name)?.value; } } }
    );

    switch (eventType) {
      case 'PAYMENT_COMPLETED': {
        const { orderId, paymentKey, amount } = data;
        
        // Find payment record
        const { data: payment } = await supabase
          .from('payments')
          .select('user_id, status')
          .eq('toss_order_id', orderId)
          .single();

        if (payment && payment.status === 'pending') {
          // Update payment status
          await supabase
            .from('payments')
            .update({ status: 'completed', payment_method: 'EASY_PAYMENT' })
            .eq('toss_order_id', orderId);

          // Add credits to user
          await supabase.rpc('add_credits', {
            p_user_id: payment.user_id,
            p_amount: amount,
          });

          // Record transaction
          await supabase.from('credit_transactions').insert({
            user_id: payment.user_id,
            amount,
            type: 'purchase',
            description: '크레딧 구매',
          });
        }
        break;
      }
  if (!event || typeof event !== "object" || Array.isArray(event)) {
    return Response.json({ error: "invalid payload" }, { status: 400 });
  }

  try {
    const type = String(event?.event_type ?? "");
    const data = event?.data;

      case 'PAYMENT_FAILED':
      case 'PAYMENT_CANCELLED': {
        const { orderId } = data;
        await supabase
          .from('payments')
          .update({ status: eventType === 'PAYMENT_CANCELLED' ? 'cancelled' : 'failed' })
          .eq('toss_order_id', orderId);
        break;
      }

      default:
        console.log('Unhandled Toss event:', eventType);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
