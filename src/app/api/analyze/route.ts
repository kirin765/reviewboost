import { classifyHeuristic, computeAnalysisFromClassified } from "@/lib/analysis";
import { inferDelimiter, parseReviewCsvWithMapping } from "@/lib/csv";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { CSV_PARSE_FAILED_HELP } from "@/lib/csv_errors";
import { classifyReviewsWithOpenAI } from "@/lib/openai_classify";
import { generateSuggestions } from "@/lib/openai_suggestions";
import { getSupabaseAdminClient } from "@/lib/supabase_server";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { readUploadedCsvText } from "@/lib/upload_csv";
import { monthStartIso, monthlyLimitForPlan, resolvePlanTierForUser, type PlanTier } from "@/lib/plan";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { devForcedAnalysisMode, devAllowAdvancedAiBypass } from "@/lib/dev_flags";
import { getGatesForPlan } from "@/lib/plan_gates";
import { topKeywords, extractPositiveKeywords } from "@/lib/keywords";
import { extractUrgentReviews } from "@/lib/urgent_reviews";
import { calculatePriorityMatrix } from "@/lib/priority_matrix";
import { simulateRatingImprovements } from "@/lib/rating_simulation";
import { generateActionItems } from "@/lib/action_items";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;
const DEFAULT_MAX_LLM_REVIEWS = 180;
const DEFAULT_MAX_LLM_REVIEWS_FREE = 60;

function readMaxLlmReviews(plan: PlanTier): number {
  if (plan === "free") {
    const raw = Number(process.env.MAX_LLM_REVIEWS_FREE ?? String(DEFAULT_MAX_LLM_REVIEWS_FREE));
    if (!Number.isFinite(raw) || raw < 10) return DEFAULT_MAX_LLM_REVIEWS_FREE;
    return Math.floor(raw);
  }
  const raw = Number(process.env.MAX_LLM_REVIEWS ?? String(DEFAULT_MAX_LLM_REVIEWS));
  if (!Number.isFinite(raw) || raw < 20) return DEFAULT_MAX_LLM_REVIEWS;
  return Math.floor(raw);
}

function pickLlmTargetIndicesByHeuristic(
  classified: Array<{ sentiment: "positive" | "neutral" | "negative"; reviewedAt?: string | null }>,
  maxCount: number
): number[] {
  if (classified.length <= maxCount) return classified.map((_, idx) => idx);

  const groups = {
    negative: [] as number[],
    neutral: [] as number[],
    positive: [] as number[]
  };

  for (let i = 0; i < classified.length; i++) {
    const s = classified[i]?.sentiment;
    if (s === "negative") groups.negative.push(i);
    else if (s === "neutral") groups.neutral.push(i);
    else groups.positive.push(i);
  }

  // Prioritize problematic reviews, then ambiguous, then positive.
  const weights = {
    negative: 0.5,
    neutral: 0.3,
    positive: 0.2
  } as const;

  const order = ["negative", "neutral", "positive"] as const;
  const picked = new Set<number>();

  for (const key of order) {
    const target = Math.floor(maxCount * weights[key]);
    const bucket = groups[key];
    for (let i = 0; i < bucket.length && i < target; i++) picked.add(bucket[i]!);
  }

  // Fill remainder with recent-first across all sentiments.
  const remainingCandidates = classified
    .map((row, idx) => ({
      idx,
      ts: row.reviewedAt ? new Date(row.reviewedAt).getTime() : 0
    }))
    .sort((a, b) => b.ts - a.ts || a.idx - b.idx)
    .map((v) => v.idx);

  for (const idx of remainingCandidates) {
    if (picked.size >= maxCount) break;
    picked.add(idx);
  }

  return Array.from(picked).sort((a, b) => a - b);
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

  const maxLlmReviews = readMaxLlmReviews(plan);

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

  // Check max reviews per analysis limit
  let truncated = false;
  const maxReviews = gates.maxReviewsPerAnalysis;
  if (rows.length > maxReviews) {
    rows = rows.slice(0, maxReviews);
    truncated = true;
    console.log(`[analyze] 리뷰 ${maxReviews}개로 제한 — 초과분 버림`);
  }

  // 1) Heuristic classification (baseline)
  let classified = classifyHeuristic(rows);
  let llmApplied = false;

  // 2) Optional: LLM classification for sentiment/category
  if (effectiveUseLLM) {
    try {
      const targetIdx = pickLlmTargetIndicesByHeuristic(classified, maxLlmReviews);
      console.log(`[LLM:analyze] 분류 요청 — plan=${plan}, 전체=${classified.length}건, LLM대상=${targetIdx.length}건`);
      const targetTexts = targetIdx.map((i) => classified[i]!.text);
      const llm = await classifyReviewsWithOpenAI({ texts: targetTexts });
      if (llm && llm.length === targetTexts.length) {
        for (let i = 0; i < targetIdx.length; i++) {
          const idx = targetIdx[i]!;
          const item = llm[i]!;
          classified[idx] = {
            ...classified[idx]!,
            sentiment: item.sentiment,
            category: item.category
          };
        }
        llmApplied = true;
        console.log(`[LLM:analyze] 분류 적용 완료 — ${targetIdx.length}건 LLM 반영`);
      } else {
        console.warn(`[LLM:analyze] 분류 결과 null 또는 길이 불일치 — heuristic 유지`);
      }
    } catch (err) {
      console.error(`[LLM:analyze] 분류 중 예외 — error=${err instanceof Error ? err.message : String(err)} → heuristic 유지`);
    }
  } else {
    console.log(`[LLM:analyze] LLM 미사용 — useLLM=false (openaiAvailable=${openaiAvailable}, forcedMode=${forcedMode ?? "none"})`);
  }

  const { stats } = computeAnalysisFromClassified(classified);

  const negativeReviewSamples = classified
    .filter((r) => r.sentiment === "negative")
    .slice(0, 5)
    .map((r) => ({ text: r.text.slice(0, 300), category: r.category }));

  const suggestions = await generateSuggestions(stats, {
    useAiNarrative: llmApplied,
    negativeReviewSamples,
    topKeywords: stats.negativeKeywordsTop10,
    totalCount: classified.length
  });

  // === V2 New Features ===
  const urgentReviews = extractUrgentReviews(classified);
  const priorityMatrix = calculatePriorityMatrix(classified, stats);
  const ratingSimulation = simulateRatingImprovements(stats, stats.negativeKeywordsTop10);

  // Extract positive keywords from positive reviews
  const positiveReviews = classified.filter((r) => r.sentiment === "positive");
  const positiveKeywordsRaw = extractPositiveKeywords(
    positiveReviews.map((r) => r.text),
    10
  );
  const positiveKeywords = positiveKeywordsRaw.map((k) => ({ ...k, sentiment: 'positive' as const }));

  const actionItems = generateActionItems(classified, suggestions);

  const payload = {
    stats,
    suggestions,
    meta: {
      filename,
      stored: false as const,
      truncated
    },
    // V2 optional fields
    urgentReviews,
    priorityMatrix,
    ratingSimulation,
    positiveKeywords,
    actionItems
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
        return Response.json({
          ...payload,
          meta: {
            filename,
            stored: true as const,
            analysisId,
            truncated
          }
        });
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
        return Response.json({
          ...payload,
          meta: {
            filename,
            stored: true as const,
            analysisId,
            truncated
          }
        });
      }
    }
  } catch {
    // 저장 실패는 분석 결과 반환을 막지 않음
  }

  return Response.json(payload);
}
