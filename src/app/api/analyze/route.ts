import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { CSV_PARSE_FAILED_HELP } from "@/lib/csv_errors";
import { auth, currentUser } from "@clerk/nextjs/server";
import { readUploadedCsvText } from "@/lib/upload_csv";
import { monthlyLimitForPlan, resolvePlanTierForUser } from "@/lib/plan";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { devForcedAnalysisMode, devAllowAdvancedAiBypass } from "@/lib/dev_flags";
import { getGatesForPlan } from "@/lib/plan_gates";
import { runAnalysisPipeline } from "@/lib/analysis_pipeline";
import { logApiError } from "@/lib/api_log";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { getErrorMessage } from "@/types/common";
import { logger } from "@/lib/logger";
import { getClientIp } from "@/lib/request-utils";
import { checkMonthlyQuota } from "./_helpers/quota";
import { toStorageError, buildStorageMeta, executePersistAndRespond } from "./_helpers/persistence";

export const runtime = "nodejs";
export const maxDuration = 300;
const ANALYZE_REQUEST_BUDGET_MS = Math.max(0, maxDuration * 1000 - 1500);

const MAX_BYTES = 6 * 1024 * 1024;

type StorageStatus = {
  attempted: boolean;
  success: boolean;
  analysisId?: string;
  step?: string;
  error: string | null;
  warning?: string | null;
};

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  const requestStartedAtMs = Date.now();

  let form: FormData;
  let filename: string | null;
  let csvText: string;
  try {
    const uploaded = await readUploadedCsvText(req, MAX_BYTES);
    filename = uploaded.filename;
    csvText = uploaded.csvText;
    form = uploaded.form;
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    const status = e instanceof ApiError ? e.status : 500;
    await logApiError({
      route: "/api/analyze",
      method: req.method,
      status,
      code: e instanceof ApiError ? e.code : "INTERNAL_ERROR",
      message: e instanceof ApiError ? e.message : "CSV 업로드 처리 중 오류가 발생했습니다.",
      details: message,
      request: req,
      error: e
    });

    if (e instanceof ApiError) return apiErrorResponse(e);
    return apiErrorResponse(
      new ApiError(status, status === 500 ? "INTERNAL_ERROR" : "CSV_PARSE_FAILED", "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", {
        details: message
      })
    );
  }

  // Get client IP for usage tracking
  const clientIp = getClientIp(req);

  const headerMode = ((form.get("headerMode") as string | null) ?? null) === "headerless" ? "headerless" : "header";
  const textCol = (form.get("textCol") as string | null) ?? null;
  const ratingCol = (form.get("ratingCol") as string | null) ?? null;
  const dateCol = (form.get("dateCol") as string | null) ?? null;
  const forcedMode = devForcedAnalysisMode();
  const openaiAvailable = Boolean(process.env.OPENAI_API_KEY);
  const useLLM = forcedMode === "llm" ? true : forcedMode === "heuristic" ? false : openaiAvailable;
  const baseCaps = getCapabilitiesBase();

  let userId: string | null = null;
  let userEmail: string | null = null;
  if (baseCaps.authConfigured) {
    try {
      const { userId: uid } = await auth();
      userId = uid ?? null;
      if (userId) {
        const user = await currentUser();
        userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
      }
    } catch {
      // ignore
    }
  }

  const plan = await resolvePlanTierForUser({ userId, email: userEmail });
  const monthlyLimit = monthlyLimitForPlan(plan);
  const gates = getGatesForPlan(plan);
  const devBypass = devAllowAdvancedAiBypass();

  let aiDecisionTag = "AI_DECISION:ENABLED";

  // Check if LLM is allowed for this plan
  let effectiveUseLLM = useLLM;
  if (!gates.allowLLM && !devBypass) {
    effectiveUseLLM = false;
    aiDecisionTag = "AI_DECISION:SKIPPED_PLANK";
    logger.debug('[LLM:analyze] LLM 비활성화', { plan, allowLLM: gates.allowLLM });
  } else if (forcedMode === "heuristic") {
    aiDecisionTag = "AI_DECISION:FORCED_HEURISTIC";
  } else if (forcedMode === "llm") {
    aiDecisionTag = "AI_DECISION:FORCED_LLM";
  }

  logger.debug('[LLM:analyze:decision]', {
    tag: aiDecisionTag,
    useLLM,
    effectiveUseLLM,
    plan,
    allowLLM: gates.allowLLM,
    devBypass,
    openaiConfigured: openaiAvailable,
    forcedMode
  });

  if (monthlyLimit !== null) {
    try {
      await checkMonthlyQuota({ userId, clientIp, plan, monthlyLimit });
    } catch (e) {
      if (e instanceof ApiError) return apiErrorResponse(e);
    }
  }

  // Run analysis pipeline
  let payload: Awaited<ReturnType<typeof runAnalysisPipeline>>["payload"];
  let classified: Awaited<ReturnType<typeof runAnalysisPipeline>>["classified"];
  try {
    ({ payload, classified } = await runAnalysisPipeline({
      csvText,
      headerMode,
      textCol,
      ratingCol,
      dateCol,
      plan,
      useLLM: effectiveUseLLM,
      startedAtMs: requestStartedAtMs,
      timeBudgetMs: ANALYZE_REQUEST_BUDGET_MS
    }));
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    await logApiError({
      route: "/api/analyze",
      method: req.method,
      status: 500,
      code: "INTERNAL_ERROR",
      message: "분석 파이프라인 처리 중 오류가 발생했습니다.",
      details: message,
      request: req,
      error: e,
      extra: { plan, stage: "run_analysis_pipeline" }
    });
    return apiErrorResponse(
      new ApiError(500, "INTERNAL_ERROR", "분석 처리 중 내부 오류가 발생했습니다.", {
        details: message
      })
    );
  }

  // Update filename in payload
  payload.meta.filename = filename;

  const storageStatus: StorageStatus = {
    attempted: false,
    success: false,
    error: null,
    warning: null
  };

  // Optional persistence (Neon via Drizzle) — only for authenticated users.
  try {
    if (!userId) {
      storageStatus.attempted = false;
      storageStatus.error = "로그인 후 히스토리에 저장됩니다.";
    } else {
      storageStatus.attempted = true;
      storageStatus.step = "analyses_insert";
      const response = await executePersistAndRespond({
        userId,
        clientIp,
        filename,
        payload,
        classified,
        storageStatus,
        clientLabel: "neon"
      });
      if (response) return response;

      if (!storageStatus.error) {
        storageStatus.error = "저장 기능을 사용할 수 없는 상태입니다.";
      }
    }
  } catch (e: unknown) {
    if (!storageStatus.error) storageStatus.error = toStorageError(getErrorMessage(e));

    await logApiError({
      route: "/api/analyze",
      method: req.method,
      status: 500,
      code: "ANALYZE_PERSISTENCE_FAILED",
      message: "분석 저장 중 오류가 발생했습니다.",
      details: storageStatus.error,
      request: req,
      error: e,
      extra: {
        route: "/api/analyze",
        userId,
        step: storageStatus.step,
        filename,
        attempted: storageStatus.attempted,
        analysisId: storageStatus.analysisId
      }
    });
  }

  return Response.json({
    ...payload,
    meta: buildStorageMeta(payload.meta, storageStatus)
  });
}
