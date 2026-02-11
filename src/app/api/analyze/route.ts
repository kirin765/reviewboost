import { classifyHeuristic, computeAnalysisFromClassified } from "@/lib/analysis";
import { inferDelimiter, parseReviewCsvWithMapping } from "@/lib/csv";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { CSV_PARSE_FAILED_HELP } from "@/lib/csv_errors";
import { classifyReviewsWithOpenAI } from "@/lib/openai_classify";
import { generateSuggestions } from "@/lib/openai_suggestions";
import { getSupabaseAdminClient } from "@/lib/supabase_server";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { readUploadedCsvText } from "@/lib/upload_csv";
import { canUseAdvancedAi, monthStartIso, monthlyLimitForPlan, resolvePlanTier } from "@/lib/plan";
import { getCapabilitiesBase } from "@/lib/capabilities";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

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
    // This also enforces: 형식(.csv), 빈 파일, 대용량, 인코딩(UTF-8) 기본 가드레일.
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

  const headerMode = (form.get("headerMode") as string | null) ?? null;
  const textCol = (form.get("textCol") as string | null) ?? null;
  const ratingCol = (form.get("ratingCol") as string | null) ?? null;
  const dateCol = (form.get("dateCol") as string | null) ?? null;
  const useLLM = String(form.get("useLLM") ?? "").trim() === "1";
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

  const plan = resolvePlanTier(userEmail);
  const monthlyLimit = monthlyLimitForPlan(plan);

  if (useLLM && !canUseAdvancedAi(plan)) {
    return apiErrorResponse(
      new ApiError(403, "PLAN_UPGRADE_REQUIRED", "AI 고급 분석은 Basic 이상 요금제에서 사용할 수 있습니다.", {
        help: ["요금제 페이지에서 Basic 이상으로 업그레이드한 뒤 다시 시도해주세요."]
      })
    );
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

  let rows;
  try {
    rows = parseReviewCsvWithMapping(csvText, {
      headerMode: headerMode === "headerless" ? "headerless" : "header",
      textCol: textCol || undefined,
      ratingCol: ratingCol || undefined,
      dateCol: dateCol || undefined
    });
  } catch (e: any) {
    return apiErrorResponse(
      new ApiError(400, "CSV_PARSE_FAILED", "CSV를 읽지 못했어요.", {
        help: [...delimiterHint(csvText), ...CSV_PARSE_FAILED_HELP],
        details: e?.message ?? String(e)
      })
    );
  }

  // 1) Heuristic classification (baseline)
  let classified = classifyHeuristic(rows);

  // 2) Optional: LLM classification for sentiment/category
  if (useLLM) {
    try {
      const llm = await classifyReviewsWithOpenAI({ texts: classified.map((r) => r.text) });
      if (llm && llm.length === classified.length) {
        classified = classified.map((r, idx) => ({
          ...r,
          sentiment: llm[idx]!.sentiment,
          category: llm[idx]!.category
        }));
      }
    } catch {
      // ignore; keep heuristic
    }
  }

  const { stats } = computeAnalysisFromClassified(classified);
  const suggestions = await generateSuggestions(stats);
  const payload = {
    stats,
    suggestions,
    meta: {
      filename,
      stored: false as const
    }
  };

  // Optional persistence (Supabase)
  try {
    // 1) If service role is configured, insert with admin client (bypasses RLS).
    const admin = getSupabaseAdminClient();
    if (admin) {
      const insertAnalysis = await admin
        .from("analyses")
        .insert({
          user_id: userId,
          input_filename: filename,
          stats,
          suggestions,
          priority_score: stats.priorityScore
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
        return Response.json({ ...payload, meta: { filename, stored: true as const, analysisId } });
      }
    }

    // 2) No service role: insert via user session (requires RLS + authenticated user).
    if (userId && supabaseAuth) {
      const insertAnalysis = await supabaseAuth
        .from("analyses")
        .insert({
          user_id: userId,
          input_filename: filename,
          stats,
          suggestions,
          priority_score: stats.priorityScore
        })
        .select("id")
        .single();

      const analysisId = insertAnalysis.data?.id as string | undefined;
      if (analysisId) {
        return Response.json({ ...payload, meta: { filename, stored: true as const, analysisId } });
      }
    }
  } catch {
    // 저장 실패는 분석 결과 반환을 막지 않음
  }

  return Response.json(payload);
}
