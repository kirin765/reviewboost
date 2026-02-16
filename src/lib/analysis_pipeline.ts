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
import { parseReviewCsvWithMapping } from "@/lib/csv";
import { classifyReviewsWithOpenAI } from "@/lib/openai_classify";
import { generateSuggestions } from "@/lib/openai_suggestions";
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

const DEFAULT_MAX_LLM_REVIEWS = 180;
const DEFAULT_MAX_LLM_REVIEWS_FREE = 60;

/**
 * Input parameters for the analysis pipeline
 */
export interface AnalysisPipelineInput {
  csvText: string;
  headerMode: string | null;
  textCol: string | null;
  ratingCol: string | null;
  dateCol: string | null;
  plan: PlanTier;
  useLLM: boolean;
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
  const gates = getGatesForPlan(plan);
  const maxLlmReviews = readMaxLlmReviews(plan);

  // Parse CSV
  const rows = parseReviewCsvWithMapping(csvText, {
    headerMode: headerMode === "headerless" ? "headerless" : "header",
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

  // 2) Optional: LLM classification for sentiment/category
  if (useLLM) {
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
    classified,
    meta: {
      filename: null,
      stored: false as const,
      truncated
    },
    urgentReviews,
    priorityMatrix,
    ratingSimulation,
    positiveKeywords,
    actionItems
  };

  return { payload, classified };
}
