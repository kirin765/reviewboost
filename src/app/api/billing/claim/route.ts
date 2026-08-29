import { auth, currentUser } from "@clerk/nextjs/server";
import { claimPendingSubscriptionByEmail } from "@/lib/billing";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";

export const runtime = "nodejs";

/**
 * 게스트(비로그인) 결제 구독 연결: 로그인한 사용자의 이메일과 일치하는
 * pending_subscriptions 가 있으면 subscriptions/profiles 로 옮긴다.
 * 로그인/계정 연결 페이지에서 호출된다.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!email) {
    return Response.json({ claimed: 0 });
  }

  const claimed = await claimPendingSubscriptionByEmail(userId, email);
  return Response.json({ claimed }, { headers: { "cache-control": "no-store" } });
}
