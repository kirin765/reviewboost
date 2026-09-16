import { auth, currentUser } from "@clerk/nextjs/server";
import { hasExtensionPaidAccess } from "@/lib/billing";
import { resolvePlanTierForUser, type PlanTier } from "@/lib/plan";

export type NavigationSessionState = {
  authenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  plan: PlanTier;
  /** 익스텐션 유료(수집 무제한) 구독 여부 — 분석 플랜과 별개. */
  extensionPlan: boolean;
};

export async function getNavigationSessionState(): Promise<NavigationSessionState> {
  let userId: string | null = null;
  let userEmail: string | null = null;
  let plan: PlanTier = "free";
  let extensionPlan = false;

  try {
    if (process.env.CLERK_SECRET_KEY) {
      const { userId: uid } = await auth();
      userId = uid ?? null;
      if (userId) {
        const user = await currentUser();
        userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
        plan = await resolvePlanTierForUser({ userId, email: userEmail });
        extensionPlan = await hasExtensionPaidAccess(userId);
      }
    }
  } catch {
    // Non-auth environments keep the sidebar in guest mode.
  }

  return { authenticated: Boolean(userId), userId, userEmail, plan, extensionPlan };
}
