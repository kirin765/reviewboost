/**
 * Clerk Backend API 서버 전용 브릿지. 클라이언트 번들에서 import 되면 안 되므로
 * 서버 라우트(웹훅, 소셜 로그인 콜백)에서만 사용한다.
 */

import { normalizeEmail } from "@/lib/billing";

/**
 * 게스트(비로그인) 결제 → 웹훅에서 이메일로 Clerk 사용자를 찾는다.
 * Clerk 미설정이거나 조회 실패 시 null (호출부가 pending 으로 보관).
 */
export async function findUserIdByEmail(email: string | null | undefined): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  if (!String(process.env.CLERK_SECRET_KEY ?? "").trim()) return null;
  try {
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const page = await client.users.getUserList({ emailAddress: [normalized], limit: 1 });
    return page?.data?.[0]?.id ?? null;
  } catch {
    return null;
  }
}
