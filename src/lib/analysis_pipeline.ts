/**
 * Analysis Pipeline Module
 *
 * This module encapsulates the core analysis logic for review classification,
 * sentiment analysis, and V2 feature generation. It is used by the /api/analyze
 * endpoint to process CSV review data.
 *
 * Key responsibilities:
 * - Parse CSV into structured review rows
 * - Run heuristic and optionally LLM-based classification
 * - Generate statistics, suggestions, and V2 features
 */

import { classifyHeuristic, computeAnalysisFromClassified } from "@/lib/analysis";
import { parseReviewCsvWithMapping, type CsvHeaderMode } from "@/lib/csv";
import { classifyReviewsWithOpenAI } from "@/lib/openai_classify";
import { generateSuggestions } from "@/lib/openai_suggestions";
import { env } from "@/lib/config";
import { type PlanTier } from "@/lib/types";
import { getGatesForPlan } from "@/lib/plan_gates";
import {
  extractUrgentReviews,
  calculatePriorityMatrix,
  simulateRatingImprovements,
  generateActionItems,
  extractPositiveKeywords
} from "@/lib/v2/features";
import type { ClassifiedReview, Suggestions, AnalysisStats } from "@/lib/types";

const LLM_DIAGNOSTIC_REASONS = [
  "LLM_NOT_REQUESTED",
  "LLM_REQUESTED_NO_TARGET",
  "LLM_CLASSIFY_OK",
  "LLM_CLASSIFY_LEN_MISMATCH",
  "LLM_CLASSIFY_ERROR"
] as const;

type AiFallbackReason = "time_budget_exhausted" | "llm_classify_len_mismatch" | "llm_classify_error" | "llm_not_requested";

type LlmDiagnosticReason = (typeof LLM_DIAGNOSTIC_REASONS)[number];

const FALLBACK_LLM_LIMITS: Record<PlanTier, number> = {
  free: 60,
  basic: 180,
  pro: 180
};

const TIME_BUDGET_GUARD_MS = 1500;
const SUGGEST_TIMEOUT_GUARD_MS = 2000;
const CLASSIFY_TIMEOUT_GUARD_MS = 2000;

/**
 * Input parameters for the analysis pipeline
 */
export interface AnalysisPipelineInput {
  csvText: string;
  headerMode: CsvHeaderMode | null;
  textCol: string | null;
  ratingCol: string | null;
  dateCol: string | null;
  plan: PlanTier;
  useLLM: boolean;
  startedAtMs?: number;
  timeBudgetMs?: number;
}

export interface AnalysisPipelineOutput {
  payload: {
    stats: AnalysisStats;
    suggestions: Suggestions;
    classified: ClassifiedReview[];
    meta: {
      filename: string | null;
      stored: false;
      truncated: boolean;
      aiFallbackReason?: AiFallbackReason;
      llmApplied?: boolean;
    };
    urgentReviews?: import("@/lib/types").UrgentReview[];
    priorityMatrix?: import("@/lib/types").PriorityMatrixItem[];
    ratingSimulation?: import("@/lib/types").RatingSimulation;
    positiveKeywords?: import("@/lib/types").PositiveKeyword[];
    actionItems?: import("@/lib/types").ActionItem[];
  };
  classified: ClassifiedReview[];
}

function normalizeTimeBudget(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return Number.POSITIVE_INFINITY;
  if (raw <= 0) return 0;
  return Math.floor(raw);
}

function normalizeHeaderMode(value: string | null | undefined): CsvHeaderMode {
  return value === "headerless" ? "headerless" : "header";
}

function normalizeMaxCount(raw: number, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  const next = Math.floor(raw);
  if (next < 1) return fallback;
  return next;
}

function readMaxLlmReviews(plan: PlanTier): number {
  const fallback = FALLBACK_LLM_LIMITS[plan];
  const raw = plan === "free" ? env.analysis.maxLlmReviewsFree : env.analysis.maxLlmReviews;
  return normalizeMaxCount(raw, fallback);
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

export async function runAnalysisPipeline(input: AnalysisPipelineInput): Promise<AnalysisPipelineOutput> {
  const { csvText, headerMode, textCol, ratingCol, dateCol, plan, useLLM } = input;
  const startedAtMsInput = input.startedAtMs;
  const startedAtMs =
    typeof startedAtMsInput === "number" && Number.isFinite(startedAtMsInput)
      ? Math.floor(startedAtMsInput)
      : Date.now();
  const timeBudgetMs = normalizeTimeBudget(input.timeBudgetMs);
  const remainingBudgetMs = () =>
    timeBudgetMs === Number.POSITIVE_INFINITY ? Number.POSITIVE_INFINITY : Math.max(0, timeBudgetMs - (Date.now() - startedAtMs));

  const gates = getGatesForPlan(plan);
  const maxLlmReviews = readMaxLlmReviews(plan);

  // Parse CSV
  const rows = parseReviewCsvWithMapping(csvText, {
    headerMode: normalizeHeaderMode(headerMode),
    textCol: textCol || undefined,
    ratingCol: ratingCol || undefined,
    dateCol: dateCol || undefined
  });

  // Check max reviews per analysis limit
  let truncated = false;
  const maxReviews = gates.maxReviewsPerAnalysis;
  if (rows.length > maxReviews) {
    rows.length = maxReviews;
    truncated = true;
    console.log(`[analyze] 리뷰 ${maxReviews}개로 제한 — 초과분 버림`);
  }

  // 1) Heuristic classification (baseline)
  let classified = classifyHeuristic(rows);
  let llmApplied = false;
  let aiFallbackReason: AiFallbackReason | undefined;

  // 2) Optional: LLM classification for sentiment/category
  let aiDiagnosticReason: LlmDiagnosticReason = "LLM_NOT_REQUESTED";
  console.log(`[LLM:analyze][${aiDiagnosticReason}] plan=${plan}, 총건=${classified.length}, target=${Math.min(classified.length, maxLlmReviews)}, maxLlmReviews=${maxLlmReviews}`);

  if (useLLM) {
    try {
      const targetIdx = pickLlmTargetIndicesByHeuristic(classified, maxLlmReviews);
      if (targetIdx.length === 0) {
        aiDiagnosticReason = "LLM_REQUESTED_NO_TARGET";
        aiFallbackReason = "llm_not_requested";
        console.log(`[LLM:analyze][${aiDiagnosticReason}] plan=${plan} 총건=${classified.length} maxLlmReviews=${maxLlmReviews}`);
      } else {
        console.log(`[LLM:analyze] 분류 요청 — plan=${plan}, 전체=${classified.length}건, LLM대상=${targetIdx.length}건`);
        const targetTexts = targetIdx.map((i) => classified[i]!.text);
        const classifyBudgetMs = remainingBudgetMs();
        const llm = await classifyReviewsWithOpenAI({
          texts: targetTexts,
          timeBudgetMs: classifyBudgetMs,
          maxConcurrency: env.openai.classifyMaxConcurrency
        });
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
          aiDiagnosticReason = "LLM_CLASSIFY_OK";
          console.log(`[LLM:analyze] 분류 적용 완료 — ${targetIdx.length}건 LLM 반영`);
          console.log(`[LLM:analyze][${aiDiagnosticReason}] plan=${plan} 총건=${classified.length} 대상=${targetIdx.length} maxLlmReviews=${maxLlmReviews}`);
        } else {
          aiDiagnosticReason = "LLM_CLASSIFY_LEN_MISMATCH";
          aiFallbackReason =
            classifyBudgetMs < env.openai.classifyTimeoutMs + CLASSIFY_TIMEOUT_GUARD_MS
              ? "time_budget_exhausted"
              : "llm_classify_len_mismatch";
          console.warn(`[LLM:analyze] 분류 결과 null 또는 길이 불일치 — heuristic 유지`);
          console.log(`[LLM:analyze][${aiDiagnosticReason}] plan=${plan} 총건=${classified.length} 대상=${targetIdx.length} 최대=${maxLlmReviews}`);
        }
      }
    } catch (err) {
      aiDiagnosticReason = "LLM_CLASSIFY_ERROR";
      aiFallbackReason = "llm_classify_error";
      console.error(`[LLM:analyze] 분류 중 예외 — error=${err instanceof Error ? err.message : String(err)} → heuristic 유지`);
      console.error(`[LLM:analyze][${aiDiagnosticReason}] plan=${plan} 총건=${classified.length} 최대=${maxLlmReviews} error=${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    console.log(`[LLM:analyze][${aiDiagnosticReason}] plan=${plan} 총건=${classified.length} 최대=${maxLlmReviews}`);
  }

  console.log(`[LLM:analyze] finalDiagnostic=${aiDiagnosticReason}`);

  const { stats } = computeAnalysisFromClassified(classified);

  const negativeReviewSamples = classified
    .filter((r) => r.sentiment === "negative")
    .slice(0, 5)
    .map((r) => ({ text: r.text.slice(0, 300), category: r.category }));

  const suggestBudgetMs = remainingBudgetMs();
  const useAiNarrativeForSuggestions = llmApplied
    ? suggestBudgetMs >= env.openai.suggestTimeoutMs + SUGGEST_TIMEOUT_GUARD_MS
    : false;
  if (llmApplied && !useAiNarrativeForSuggestions) {
    aiFallbackReason = "time_budget_exhausted";
    console.warn(
      `[LLM:analyze] Suggestion time budget 부족으로 템플릿 폴백 — remaining=${suggestBudgetMs}ms, timeout=${env.openai.suggestTimeoutMs}ms`
    );
  }

  const suggestions = await generateSuggestions(stats, {
    useAiNarrative: useAiNarrativeForSuggestions,
    negativeReviewSamples,
    topKeywords: stats.negativeKeywordsTop10,
    totalCount: classified.length,
    timeBudgetMs: suggestBudgetMs - TIME_BUDGET_GUARD_MS
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
    classified,
    meta: {
      filename: null,
      stored: false as const,
      truncated,
      aiFallbackReason,
      llmApplied: useAiNarrativeForSuggestions
    },
    urgentReviews,
    priorityMatrix,
    ratingSimulation,
    positiveKeywords,
    actionItems
  };

  return { payload, classified };
}
