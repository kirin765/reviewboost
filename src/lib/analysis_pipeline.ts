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
import { logger } from "./logger";
import { normalizeTimeBudget, normalizeHeaderMode, normalizeMaxCount } from "./normalizers";

type AiFallbackReason = "time_budget_exhausted" | "llm_classify_error" | "llm_not_requested";

type LlmDiagnosticReason =
  | "LLM_NOT_REQUESTED"
  | "LLM_REQUESTED_NO_TARGET"
  | "LLM_CLASSIFY_OK"
  | "LLM_CLASSIFY_FAILED"
  | "LLM_CLASSIFY_ERROR";

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
    logger.debug('[analyze] 리뷰 제한 — 초과분 버림', { maxReviews });
  }

  // 1) Heuristic classification (baseline)
  let classified = classifyHeuristic(rows);
  let llmApplied = false;
  let aiFallbackReason: AiFallbackReason | undefined;

  // 2) Optional: LLM classification for sentiment/category
  let aiDiagnosticReason: LlmDiagnosticReason = "LLM_NOT_REQUESTED";
  logger.debug('[LLM:analyze] 초기 진단', { reason: aiDiagnosticReason, plan, total: classified.length, target: Math.min(classified.length, maxLlmReviews), maxLlmReviews });

  if (useLLM) {
    try {
      const targetIdx = pickLlmTargetIndicesByHeuristic(classified, maxLlmReviews);
      if (targetIdx.length === 0) {
        aiDiagnosticReason = "LLM_REQUESTED_NO_TARGET";
        aiFallbackReason = "llm_not_requested";
        logger.debug('[LLM:analyze] 분류 대상 없음', { reason: aiDiagnosticReason, plan, total: classified.length, maxLlmReviews });
      } else {
        logger.debug('[LLM:analyze] 분류 요청', { plan, total: classified.length, llmTarget: targetIdx.length });
        const targetTexts = targetIdx.map((i) => classified[i]!.text);
        const targetFallbacks = targetIdx.map((i) => ({
          sentiment: classified[i]!.sentiment,
          category: classified[i]!.category
        }));
        const classifyBudgetMs = remainingBudgetMs();
        const llm = await classifyReviewsWithOpenAI({
          texts: targetTexts,
          fallbackClassifications: targetFallbacks,
          timeBudgetMs: classifyBudgetMs,
          maxConcurrency: env.openai.classifyMaxConcurrency
        });
        if (llm) {
          let appliedFromLlm = 0;
          for (let i = 0; i < targetIdx.length; i++) {
            const idx = targetIdx[i]!;
            const item = llm.classifications[i];
            if (!item) continue;
            classified[idx] = {
              ...classified[idx]!,
              sentiment: item.sentiment,
              category: item.category
            };
            const heuristic = targetFallbacks[i]!;
            if (item.sentiment !== heuristic.sentiment || item.category !== heuristic.category) {
              appliedFromLlm++;
            }
          }
          llmApplied = appliedFromLlm > 0;
          aiDiagnosticReason = "LLM_CLASSIFY_OK";
          logger.debug('[LLM:analyze] 분류 적용 완료', { target: targetIdx.length, llmApplied: appliedFromLlm, failedBatches: llm.failedBatchCount });
          logger.debug('[LLM:analyze] 분류 결과', { reason: aiDiagnosticReason, plan, total: classified.length, target: targetIdx.length, maxLlmReviews });
        } else {
          aiDiagnosticReason = "LLM_CLASSIFY_FAILED";
          aiFallbackReason =
            classifyBudgetMs < env.openai.classifyTimeoutMs + CLASSIFY_TIMEOUT_GUARD_MS
              ? "time_budget_exhausted"
              : "llm_classify_error";
          logger.warn('[LLM:analyze] 분류 결과 null 또는 길이 불일치 — heuristic 유지');
          logger.debug('[LLM:analyze] 분류 불일치 진단', { reason: aiDiagnosticReason, plan, total: classified.length, target: targetIdx.length, maxLlmReviews });
        }
      }
    } catch (err) {
      aiDiagnosticReason = "LLM_CLASSIFY_ERROR";
      aiFallbackReason = "llm_classify_error";
      logger.error('[LLM:analyze] 분류 중 예외 — heuristic 유지', { error: err instanceof Error ? err.message : String(err) });
      logger.error('[LLM:analyze] 분류 예외 진단', { reason: aiDiagnosticReason, plan, total: classified.length, maxLlmReviews, error: err instanceof Error ? err.message : String(err) });
    }
  } else {
    logger.debug('[LLM:analyze] LLM 미사용', { reason: aiDiagnosticReason, plan, total: classified.length, maxLlmReviews });
  }

  logger.debug('[LLM:analyze] 최종 진단', { finalDiagnostic: aiDiagnosticReason });

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
    logger.warn('[LLM:analyze] Suggestion time budget 부족으로 템플릿 폴백', { remaining: suggestBudgetMs, timeout: env.openai.suggestTimeoutMs });
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
