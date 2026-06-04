import { monthStartIso } from "@/lib/plan";
import { ApiError } from "@/lib/api_error";
import { countAnalysesForUserSince } from "@/lib/db/queries";
import type { PlanTier } from "@/lib/types";

export async function checkMonthlyQuota(args: {
  userId: string | null;
  clientIp: string | null;
  plan: PlanTier;
  monthlyLimit: number;
}): Promise<void> {
  const { userId, monthlyLimit } = args;

  // Monthly limit is only enforced for authenticated users (Neon clean slate:
  // anonymous client-IP quota is dropped — guest analyses are not persisted).
  if (!userId) return;

  try {
    const used = await countAnalysesForUserSince(userId, monthStartIso());
    if (used >= monthlyLimit) {
      throw new ApiError(429, "MONTHLY_LIMIT_EXCEEDED", `이번 달 분석 한도(${monthlyLimit}회)를 초과했습니다.`, {
        help: ["다음 달에 다시 시도하거나 상위 요금제로 업그레이드해주세요."]
      });
    }
  } catch (e) {
    if (e instanceof ApiError) throw e;
    // count 실패 시 무시하고 분석 계속
  }
}
