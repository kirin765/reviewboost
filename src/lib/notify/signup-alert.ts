import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { sendTelegram } from "./telegram";

// New signups are redirected to /dashboard within seconds of creating their
// account, so a 24h "is recent" gate keeps pre-existing users from firing an
// alert on their next visit while still catching every genuine new signup.
const RECENT_SIGNUP_MS = 24 * 60 * 60 * 1000;

/**
 * Fires a one-time "[ReviewBoost] new signup" Telegram alert the first time a
 * freshly-created user lands on the dashboard. Idempotent via a
 * private_metadata sentinel; best-effort so it never blocks page render.
 */
export async function maybeAlertNewSignup(): Promise<void> {
  try {
    const user = await currentUser();
    if (!user) return;
    if (user.privateMetadata?.signup_alert_sent_at) return;
    const createdAt = typeof user.createdAt === "number" ? user.createdAt : 0;
    if (Date.now() - createdAt > RECENT_SIGNUP_MS) return;

    const email = user.emailAddresses?.[0]?.emailAddress ?? null;
    const nickname = user.firstName || email?.split("@")[0] || "사장님";
    await sendTelegram(`[ReviewBoost] 🎉 신규 회원가입\n닉네임: ${nickname}\nemail: ${email || "(없음)"}`);

    // Mark sent so this fires exactly once per user. updateUserMetadata merges
    // top-level keys, so day7_email_sent_at (set by the cron) is preserved.
    const client = await clerkClient();
    await client.users.updateUserMetadata(user.id, {
      privateMetadata: { signup_alert_sent_at: new Date().toISOString() },
    });
  } catch {
    // best-effort; never block dashboard render
  }
}
