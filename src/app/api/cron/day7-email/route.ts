import { NextResponse } from "next/server";
import { listSignupsCreatedBetween, markDay7Sent } from "@/lib/outreach/recent-signups";
import { deriveNickname, buildOutreachEmail } from "@/lib/outreach/template";
import { sendNaverEmail } from "@/lib/notify/email";
import { sendTelegram } from "@/lib/notify/telegram";

export const runtime = "nodejs";
export const maxDuration = 60;

const DAY_MS = 24 * 60 * 60 * 1000;
// Target users who crossed the 7-day mark. A 25h look-back (24h cadence + 1h
// buffer) means a slightly-late cron run never skips a signup's day-7 window.
const WINDOW_MS = 25 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = Date.now();
  const beforeMs = now - 7 * DAY_MS; // signed up at least 7 days ago
  const afterMs = beforeMs - WINDOW_MS; // ...but crossed day 7 within the last ~25h

  // Ignore members who were already past 7 days when this feature launched.
  // Set to (launch time − 7 days) in ms so the launch-week cohort still gets it.
  const minCreated = Number(process.env.DAY7_EMAIL_MIN_CREATED_MS ?? 0);

  const signups = await listSignupsCreatedBetween(afterMs, beforeMs);
  const targets = signups.filter((s) => s.email && !s.day7Sent && s.createdAt >= minCreated);

  let sent = 0;
  const failures: string[] = [];
  for (const s of targets) {
    try {
      const { subject, text } = buildOutreachEmail(deriveNickname(s));
      // Send then mark (at-least-once): a failed mark may re-send once on the
      // next in-window run — preferred over marking-then-failing-to-send.
      await sendNaverEmail({ to: s.email!, subject, text });
      await markDay7Sent(s.id, new Date(now).toISOString());
      sent++;
    } catch (e) {
      failures.push(`${s.email}: ${(e as Error).message}`);
    }
  }

  if (sent > 0 || failures.length > 0) {
    await sendTelegram(
      `[ReviewBoost] 📨 가입 7일차 아웃리치 메일\n발송: ${sent}건` +
        (failures.length ? `\n실패: ${failures.length}건\n${failures.join("\n")}` : ""),
    );
  }
  return NextResponse.json({ scanned: signups.length, targets: targets.length, sent, failures });
}
