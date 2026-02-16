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

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

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

export async function POST(req: Request) {
  let form: FormData;
  let filename: string | null;
  let csvText: string;
  try {
    const uploaded = await readUploadedCsvText(req, MAX_BYTES);
    filename = uploaded.filename;
    csvText = uploaded.csvText;
    form = uploaded.form;
  } catch (e: any) {
    if (e instanceof ApiError) return apiErrorResponse(e);
    return apiErrorResponse(
      new ApiError(500, "CSV_PARSE_FAILED", "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", {
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
  const { payload, classified } = await runAnalysisPipeline({
    csvText,
    headerMode,
    textCol,
    ratingCol,
    dateCol,
    plan,
    useLLM: effectiveUseLLM
  });

  // Update filename in payload
  payload.meta.filename = filename;

  // Optional persistence (Supabase)
  try {
    const admin = getSupabaseAdminClient();
    if (admin) {
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
        if (reviews.length) await admin.from("reviews").insert(reviews);
        return Response.json({
          ...payload,
          meta: {
            filename,
            stored: true as const,
            analysisId,
            truncated: payload.meta.truncated
          }
        });
      }
    }

    if (userId && supabaseAuth) {
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

      const analysisId = insertAnalysis.data?.id as string | undefined;
      if (analysisId) {
        return Response.json({
          ...payload,
          meta: {
            filename,
            stored: true as const,
            analysisId,
            truncated: payload.meta.truncated
          }
        });
      }
    }
  } catch {
    // 저장 실패는 분석 결과 반환을 막지 않음
  }

  return Response.json(payload);
}
