import { auth, currentUser } from "@clerk/nextjs/server";
import { resolvePlanTierForUser, type PlanTier } from "@/lib/plan";

export type NavigationSessionState = {
  authenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  plan: PlanTier;
};

export async function getNavigationSessionState(): Promise<NavigationSessionState> {
  let userId: string | null = null;
  let userEmail: string | null = null;
  let plan: PlanTier = "free";

  try {
    if (process.env.CLERK_SECRET_KEY) {
      const { userId: uid } = await auth();
      userId = uid ?? null;
      if (userId) {
        const user = await currentUser();
        userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
        plan = await resolvePlanTierForUser({ userId, email: userEmail });
      }
    }
  } catch {
    // Non-auth environments keep the sidebar in guest mode.
  }

  return { authenticated: Boolean(userId), userId, userEmail, plan };
}
