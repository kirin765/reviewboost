import { auth, currentUser } from "@clerk/nextjs/server";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { monthStartIso, monthlyLimitForPlan, planLabel, resolvePlanTierForUser } from "@/lib/plan";
import { countAnalysesForUserSince } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function GET() {
  const base = getCapabilitiesBase();
  let email: string | null = null;
  let userId: string | null = null;

  if (base.authConfigured) {
    try {
      const { userId: uid } = await auth();
      userId = uid ?? null;
      if (userId) {
        const user = await currentUser();
        email = user?.emailAddresses?.[0]?.emailAddress ?? null;
      }
    } catch {
      // ignore
    }
  }

  const plan = await resolvePlanTierForUser({ userId, email });
  const monthlyLimit = monthlyLimitForPlan(plan);
  let monthlyUsed = 0;

  if (base.databaseConfigured && userId) {
    try {
      monthlyUsed = await countAnalysesForUserSince(userId, monthStartIso());
    } catch {
      // ignore
    }
  }

  return Response.json({
    ...base,
    plan,
    planLabel: planLabel(plan),
    monthlyLimit,
    monthlyUsed,
    aiAdvancedAvailable: base.openaiConfigured
  });
}
