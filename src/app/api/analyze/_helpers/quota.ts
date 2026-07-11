import { monthStartIso } from "@/lib/plan";
import { ApiError } from "@/lib/api_error";
import { reserveAnalysisSlot } from "@/lib/db/queries";
import type { PlanTier } from "@/lib/types";

/**
 * Reserves an analysis slot for an authenticated user BEFORE the (expensive)
 * pipeline runs. The reservation is a single conditional insert, so concurrent
 * requests can no longer all pass a stale count and each run paid LLM work.
 *
 * - Over the monthly limit → throws ApiError(429).
 * - DB not configured (no DATABASE_URL) → returns { analysisId: null } (unmetered).
 * - Transient DB error → throws ApiError(503) (fail closed: a DB error must not
 *   silently disable the limit).
 *
 * Returns the reserved row id so the caller can finalize or release it.
 */
export async function reserveMonthlyQuotaSlot(args: {
  userId: string;
  clientIp: string | null;
  filename: string | null;
  plan: PlanTier;
  monthlyLimit: number | null;
}): Promise<{ analysisId: string | null }> {
  try {
    const result = await reserveAnalysisSlot({
      userId: args.userId,
      clientIp: args.clientIp,
      inputFilename: args.filename,
      sinceIso: monthStartIso(),
      monthlyLimit: args.monthlyLimit
    });

    if (result.ok) return { analysisId: result.id };

    if (result.reason === "over_limit") {
      throw new ApiError(429, "MONTHLY_LIMIT_EXCEEDED", `이번 달 분석 한도(${args.monthlyLimit}회)를 초과했습니다.`, {
        help: ["다음 달에 다시 시도하거나 상위 요금제로 업그레이드해주세요."]
      });
    }

    // storage_off: no database configured — cannot persist or meter.
    return { analysisId: null };
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(503, "QUOTA_CHECK_UNAVAILABLE", "요청을 처리할 수 없습니다. 잠시 후 다시 시도해주세요.", {
      help: ["잠시 후 다시 시도해주세요. 문제가 지속되면 문의해주세요."]
    });
  }
}
