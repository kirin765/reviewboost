import { getSupabaseAdminClient } from "@/lib/supabase_server";
import { monthStartIso } from "@/lib/plan";
import { ApiError } from "@/lib/api_error";
import type { PlanTier } from "@/lib/types";

export async function checkMonthlyQuota(args: {
  userId: string | null;
  clientIp: string | null;
  plan: PlanTier;
  monthlyLimit: number;
  supabaseAuth: any;
}): Promise<void> {
  const { userId, clientIp, plan, monthlyLimit, supabaseAuth } = args;

  // userId 기준 한도 확인
  if (userId && supabaseAuth) {
    try {
      const { count } = await supabaseAuth
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStartIso());
      if ((count ?? 0) >= monthlyLimit) {
        throw new ApiError(429, "MONTHLY_LIMIT_EXCEEDED", `이번 달 분석 한도(${monthlyLimit}회)를 초과했습니다.`, {
          help: ["다음 달에 다시 시도하거나 상위 요금제로 업그레이드해주세요."]
        });
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      // count 실패 시 무시하고 분석 계속
    }
    return;
  }

  // IP 기반 한도 (free plan, anonymous)
  if (!userId && clientIp && plan === "free") {
    try {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { count } = await admin
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("client_ip", clientIp)
          .gte("created_at", monthStartIso());
        if ((count ?? 0) >= monthlyLimit) {
          throw new ApiError(429, "MONTHLY_LIMIT_EXCEEDED", `이번 달 분석 한도(${monthlyLimit}회)를 초과했습니다. 로그인하면 더 많은 분석을 이용할 수 있습니다.`, {
            help: ["로그인하여 무제한 분석을 이용하거나, 다음 달에 다시 시도해주세요."]
          });
        }
      }
    } catch (e) {
      if (e instanceof ApiError) throw e;
      // count 실패 시 무시하고 분석 계속
    }
  }
}
