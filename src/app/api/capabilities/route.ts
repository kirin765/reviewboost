import { getCapabilitiesBase } from "@/lib/capabilities";
import { canUseAdvancedAi, monthStartIso, monthlyLimitForPlan, planLabel, resolvePlanTier } from "@/lib/plan";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const base = getCapabilitiesBase();
  let email: string | null = null;
  let userId: string | null = null;

  if (base.supabaseConfigured) {
    try {
      const supabase = createSupabaseServerActionClient();
      const { data } = await supabase.auth.getUser();
      email = data.user?.email ?? null;
      userId = data.user?.id ?? null;
    } catch {
      // ignore
    }
  }

  const plan = resolvePlanTier(email);
  const monthlyLimit = monthlyLimitForPlan(plan);
  let monthlyUsed = 0;

  if (base.supabaseConfigured && userId) {
    try {
      const supabase = createSupabaseServerActionClient();
      const { count } = await supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStartIso());
      monthlyUsed = count ?? 0;
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
    aiAdvancedAvailable: base.openaiConfigured && canUseAdvancedAi(plan)
  });
}
