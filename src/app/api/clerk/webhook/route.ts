import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { sendTelegram } from "@/lib/notify/telegram";

export const runtime = "nodejs";

interface ClerkEmailAddress { id: string; email_address: string }
interface ClerkUserPayload {
  id: string;
  first_name?: string | null;
  primary_email_address_id?: string | null;
  email_addresses?: ClerkEmailAddress[];
}
interface ClerkWebhookEvent {
  type: string;
  data: ClerkUserPayload;
}

function timingSafeEqB64(a: string, b: string): boolean {
  const A = Buffer.from(a, "utf8");
  const B = Buffer.from(b, "utf8");
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

function verifySvixSignature(opts: { secret: string; id: string; timestamp: string; body: string; signatureHeader: string }): boolean {
  const secretRaw = opts.secret.startsWith("whsec_") ? opts.secret.slice(6) : opts.secret;
  const key = Buffer.from(secretRaw, "base64");
  const toSign = `${opts.id}.${opts.timestamp}.${opts.body}`;
  const expected = crypto.createHmac("sha256", key).update(toSign).digest("base64");
  // Header format: "v1,<sig> v1,<sig2> ..."
  const sigs = opts.signatureHeader
    .split(/\s+/)
    .map((s) => (s.startsWith("v1,") ? s.slice(3) : null))
    .filter((s): s is string => !!s);
  return sigs.some((s) => timingSafeEqB64(s, expected));
}

function primaryEmail(p: ClerkUserPayload): string | null {
  const addrs = p.email_addresses ?? [];
  const primary = addrs.find((a) => a.id === p.primary_email_address_id);
  return primary?.email_address ?? addrs[0]?.email_address ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook not configured" }, { status: 500 });

  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signature = req.headers.get("svix-signature");
  if (!id || !timestamp || !signature) return NextResponse.json({ error: "missing svix headers" }, { status: 400 });

  // Reject events older than 5 minutes
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return NextResponse.json({ error: "stale timestamp" }, { status: 400 });
  }

  const body = await req.text();
  if (!verifySvixSignature({ secret, id, timestamp, body, signatureHeader: signature })) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: ClerkWebhookEvent;
  try {
    event = JSON.parse(body) as ClerkWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const email = primaryEmail(event.data);
    const nickname = event.data.first_name || email?.split("@")[0] || "사장님";
    await sendTelegram(`[ReviewBoost] 🎉 신규 회원가입\n닉네임: ${nickname}\nemail: ${email || "(없음)"}`);
  }
  // ack-and-skip everything else so Clerk doesn't retry
  return NextResponse.json({ ok: true });
}
