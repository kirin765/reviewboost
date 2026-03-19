import { getCapabilitiesBase } from "@/lib/capabilities";
import { resolvePlanTierForUser, type PlanTier } from "@/lib/plan";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export type NavigationSessionState = {
  authenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  plan: PlanTier;
};

export async function getNavigationSessionState(): Promise<NavigationSessionState> {
  const { supabaseConfigured } = getCapabilitiesBase();
  let userEmail: string | null = null;
  let userId: string | null = null;
  let plan: PlanTier = "free";

  try {
    if (supabaseConfigured) {
      const supabase = await createSupabaseServerComponentClient();
      const { data } = await supabase.auth.getUser();
      userEmail = data.user?.email ?? null;
      userId = data.user?.id ?? null;
      plan = await resolvePlanTierForUser({ userId, email: userEmail });
    }
  } catch {
    // Non-auth environments keep the sidebar in guest mode.
  }

  return {
    authenticated: Boolean(userEmail),
    userId,
    userEmail,
    plan
  };
}
