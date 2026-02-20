import { inferDelimiter } from "@/lib/csv";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { CSV_PARSE_FAILED_HELP } from "@/lib/csv_errors";
import { getSupabaseAdminClient } from "@/lib/supabase_server";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { readUploadedCsvText } from "@/lib/upload_csv";
import { monthStartIso, monthlyLimitForPlan, resolvePlanTierForUser } from "@/lib/plan";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { devForcedAnalysisMode, devAllowAdvancedAiBypass } from "@/lib/dev_flags";
import { getGatesForPlan } from "@/lib/plan_gates";
import { runAnalysisPipeline } from "@/lib/analysis_pipeline";
import { logApiError } from "@/lib/api_log";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

type StorageStatus = {
  attempted: boolean;
  success: boolean;
  analysisId?: string;
  step?: string;
  error: string | null;
};

/**
 * Extract client IP address from request headers.
 * Handles proxies and load balancers (x-forwarded-for, etc.)
 */
function getClientIp(req: Request): string | null {
  const headers = req.headers;

  // Check x-forwarded-for header (common for proxies/load balancers)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
    return forwarded.split(",")[0].trim();
  }

  // Check x-real-ip header (commonly set by nginx, etc.)
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Check cf-connecting-ip (Cloudflare)
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  return null;
}

function delimiterHint(csvText: string): string[] {
  const delimiter = inferDelimiter(csvText);
  if (delimiter === ",") return [];
  return [
    `구분자가 '${delimiter === "\t" ? "TAB" : delimiter}' 로 감지되었습니다. 엑셀에서 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장하면 가장 안정적입니다.`
  ];
}

function toStorageError(message?: string | null) {
  return message && String(message).trim() ? String(message).trim() : "저장에 실패했습니다.";
}

function extractErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error) || String(error);
  } catch {
    return String(error);
  }
}

function buildStorageMeta(base: any, storage: StorageStatus) {
  return {
    ...base,
    filename: base?.filename ?? null,
    stored: storage.success,
    analysisId: storage.analysisId,
    truncated: base?.truncated,
    storageAttempted: storage.attempted,
    storageError: storage.success ? null : storage.error,
    storageStep: storage.step ?? null
  };
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  let form: FormData;
  let filename: string | null;
  let csvText: string;
  try {
    const uploaded = await readUploadedCsvText(req, MAX_BYTES);
    filename = uploaded.filename;
    csvText = uploaded.csvText;
    form = uploaded.form;
  } catch (e: any) {
    const status = e instanceof ApiError ? e.status : 500;
    await logApiError({
      route: "/api/analyze",
      method: req.method,
      status,
      code: e instanceof ApiError ? e.code : "INTERNAL_ERROR",
      message: e instanceof ApiError ? e.message : "CSV 업로드 처리 중 오류가 발생했습니다.",
      details: e?.message ?? String(e),
      request: req,
      error: e
    });

    if (e instanceof ApiError) return apiErrorResponse(e);
    return apiErrorResponse(
      new ApiError(status, status === 500 ? "INTERNAL_ERROR" : "CSV_PARSE_FAILED", "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", {
        details: e?.message ?? String(e)
      })
    );
  }

  // Get client IP for usage tracking
  const clientIp = getClientIp(req);

  const headerMode = (form.get("headerMode") as string | null) ?? null;
  const textCol = (form.get("textCol") as string | null) ?? null;
  const ratingCol = (form.get("ratingCol") as string | null) ?? null;
  const dateCol = (form.get("dateCol") as string | null) ?? null;
  const forcedMode = devForcedAnalysisMode();
  const openaiAvailable = Boolean(process.env.OPENAI_API_KEY);
  const useLLM = forcedMode === "llm" ? true : forcedMode === "heuristic" ? false : openaiAvailable;
  const baseCaps = getCapabilitiesBase();

  let supabaseAuth: ReturnType<typeof createSupabaseServerActionClient> | null = null;
  let userId: string | null = null;
  let userEmail: string | null = null;
  if (baseCaps.supabaseConfigured) {
    try {
      supabaseAuth = createSupabaseServerActionClient();
      const { data } = await supabaseAuth.auth.getUser();
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    } catch {
      // ignore
    }
  }

  const plan = await resolvePlanTierForUser({ userId, email: userEmail });
  const monthlyLimit = monthlyLimitForPlan(plan);
  const gates = getGatesForPlan(plan);
  const devBypass = devAllowAdvancedAiBypass();

  // Check if LLM is allowed for this plan
  let effectiveUseLLM = useLLM;
  if (!gates.allowLLM && !devBypass) {
    effectiveUseLLM = false;
    console.log(`[LLM:analyze] LLM 비활성화 — plan=${plan}, allowLLM=${gates.allowLLM}`);
  }

  if (monthlyLimit !== null && userId && supabaseAuth) {
    try {
      const { count } = await supabaseAuth
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .gte("created_at", monthStartIso());
      if ((count ?? 0) >= monthlyLimit) {
        return apiErrorResponse(
          new ApiError(429, "MONTHLY_LIMIT_EXCEEDED", `이번 달 분석 한도(${monthlyLimit}회)를 초과했습니다.`, {
            help: ["다음 달에 다시 시도하거나 상위 요금제로 업그레이드해주세요."]
          })
        );
      }
    } catch {
      // ignore count failure and continue analysis
    }
  }

  // IP-based limiting for free users (no userId)
  // This helps prevent abuse from anonymous users
  if (monthlyLimit !== null && !userId && clientIp && plan === "free") {
    try {
      const admin = getSupabaseAdminClient();
      if (admin) {
        const { count } = await admin
          .from("analyses")
          .select("id", { count: "exact", head: true })
          .eq("client_ip", clientIp)
          .gte("created_at", monthStartIso());
        if ((count ?? 0) >= monthlyLimit) {
          return apiErrorResponse(
            new ApiError(429, "MONTHLY_LIMIT_EXCEEDED", `이번 달 분석 한도(${monthlyLimit}회)를 초과했습니다. 로그인하면 더 많은 분석을 이용할 수 있습니다.`, {
              help: ["로그인하여 무제한 분석을 이용하거나, 다음 달에 다시 시도해주세요."]
            })
          );
        }
      }
    } catch {
      // ignore count failure and continue analysis
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
      useLLM: effectiveUseLLM
    }));
  } catch (e: any) {
    await logApiError({
      route: "/api/analyze",
      method: req.method,
      status: 500,
      code: "INTERNAL_ERROR",
      message: "분석 파이프라인 처리 중 오류가 발생했습니다.",
      details: e?.message ?? String(e),
      request: req,
      error: e,
      extra: { plan, stage: "run_analysis_pipeline" }
    });
    return apiErrorResponse(
      new ApiError(500, "INTERNAL_ERROR", "분석 처리 중 내부 오류가 발생했습니다.", {
        details: e?.message ?? String(e)
      })
    );
  }

  // Update filename in payload
  payload.meta.filename = filename;

  const storageStatus: StorageStatus = {
    attempted: false,
    success: false,
    error: null
  };

  // Optional persistence (Supabase)
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
      storageStatus.attempted = true;
      storageStatus.step = "analyses_insert_admin";

      if (!userId) {
        storageStatus.attempted = false;
        storageStatus.error = "로그인 후 히스토리에 저장됩니다.";
      } else {
        const insertAnalysis = await admin
          .from("analyses")
          .insert({
            user_id: userId,
            client_ip: clientIp,
            input_filename: filename,
            stats: payload.stats,
            suggestions: payload.suggestions,
            priority_score: payload.stats.priorityScore
          })
          .select("id")
          .single();

        if (insertAnalysis.error) {
          storageStatus.error = toStorageError(`analyses_insert_admin_failed: ${insertAnalysis.error.message ?? JSON.stringify(insertAnalysis.error)}`);
          throw new Error(storageStatus.error);
        }

        const analysisId = insertAnalysis.data?.id as string | undefined;
        if (analysisId) {
          const reviews = classified.slice(0, 5000).map((r) => ({
            analysis_id: analysisId,
            rating: r.rating,
            text: r.text,
            sentiment: r.sentiment,
            category: r.category,
            reviewed_at: r.reviewedAt ?? null
          }));
          if (reviews.length) {
            storageStatus.step = "reviews_insert_admin";
            const insertReviews = await admin.from("reviews").insert(reviews);
            if (insertReviews.error) {
              storageStatus.error = toStorageError(`reviews_insert_admin_failed: ${insertReviews.error.message ?? JSON.stringify(insertReviews.error)}`);
              throw new Error(storageStatus.error);
            }
          }

          storageStatus.success = true;
          storageStatus.analysisId = analysisId;
          storageStatus.error = null;
          return Response.json({
            ...payload,
            meta: buildStorageMeta(payload.meta, storageStatus)
          });
        }

        storageStatus.error = "analyses_insert_admin_no_id";
      }
    }

    if (userId && supabaseAuth) {
      storageStatus.attempted = true;
      storageStatus.step = "analyses_insert_auth";
      const insertAnalysis = await supabaseAuth
        .from("analyses")
        .insert({
          user_id: userId,
          client_ip: clientIp,
          input_filename: filename,
          stats: payload.stats,
          suggestions: payload.suggestions,
          priority_score: payload.stats.priorityScore
        })
        .select("id")
        .single();

      if (insertAnalysis.error) {
        storageStatus.error = toStorageError(`analyses_insert_auth_failed: ${insertAnalysis.error.message ?? JSON.stringify(insertAnalysis.error)}`);
        throw new Error(storageStatus.error);
      }

      const analysisId = insertAnalysis.data?.id as string | undefined;
      if (analysisId) {
        storageStatus.success = true;
        storageStatus.analysisId = analysisId;
        storageStatus.error = null;
        return Response.json({
          ...payload,
          meta: buildStorageMeta(payload.meta, storageStatus)
        });
      }

      storageStatus.error = "analyses_insert_auth_no_id";
    }

    if (!storageStatus.error) {
      storageStatus.error = userId ? "저장 기능을 사용할 수 없는 상태입니다." : "로그인 후 히스토리에 저장됩니다.";
    }
  } catch (e: unknown) {
    if (!storageStatus.error) storageStatus.error = toStorageError(extractErrorMessage(e));

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
