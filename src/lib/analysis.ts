import type { AnalysisOutput, AnalysisStats, Category, ClassifiedReview, ReviewRow, Sentiment } from "@/lib/types";
import { topKeywords } from "@/lib/keywords";

const NEGATIVE_HINTS = [
  "불량",
  "하자",
  "깨짐",
  "파손",
  "늦",
  "지연",
  "불친절",
  "환불",
  "교환",
  "반품",
  "실망",
  "최악",
  "문제",
  "오류",
  "냄새",
  "누락",
  "부족",
  "불편"
];

const CATEGORY_KEYWORDS: Array<{ category: Category; keywords: string[] }> = [
  { category: "배송", keywords: ["배송", "택배", "도착", "지연", "늦", "포장", "파손", "깨짐", "분실"] },
  { category: "품질", keywords: ["품질", "퀄", "불량", "하자", "고장", "내구", "재질", "마감", "새", "냄새"] },
  { category: "가격", keywords: ["가격", "비싸", "가성비", "할인", "쿠폰", "비용", "부담"] },
  { category: "사용성", keywords: ["사용", "설치", "조립", "설명서", "어렵", "불편", "사이즈", "크기", "무게", "기능"] },
  { category: "CS", keywords: ["문의", "응대", "답변", "cs", "고객", "센터", "처리", "환불", "교환", "반품", "as"] }
];

const CATEGORY_IMPACT: Record<Category, number> = {
  품질: 1.0,
  CS: 0.9,
  사용성: 0.85,
  배송: 0.75,
  가격: 0.65,
  기타: 0.55
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function guessSentiment(row: ReviewRow): Sentiment {
  if (row.rating !== null) {
    if (row.rating >= 4) return "positive";
    if (row.rating <= 2) return "negative";
    return "neutral";
  }
  const t = row.text;
  const neg = NEGATIVE_HINTS.some((h) => t.includes(h));
  return neg ? "negative" : "neutral";
}

function categorize(text: string): Category {
  const lower = text.toLowerCase();
  for (const entry of CATEGORY_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k))) return entry.category;
  }
  return "기타";
}

export function classifyHeuristic(rows: ReviewRow[]): ClassifiedReview[] {
  return rows
    .map((r) => ({
      ...r,
      sentiment: guessSentiment(r),
      category: categorize(r.text)
    }))
    .filter((r) => r.text.trim().length > 0);
}

function computeRecentness(classified: ClassifiedReview[]) {
  const dates = classified
    .map((r) => r.reviewedAt ?? null)
    .filter((s): s is string => typeof s === "string" && s.length > 0)
    .map((s) => new Date(s))
    .filter((d) => Number.isFinite(d.getTime()));

  if (dates.length === 0) {
    return { hasDates: false, last30Share: 0, last90Share: 0, last30NegativeRatio: null as number | null };
  }

  const newest = new Date(Math.max(...dates.map((d) => d.getTime())));
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const ms90 = 90 * 24 * 60 * 60 * 1000;
  const cutoff30 = new Date(newest.getTime() - ms30);
  const cutoff90 = new Date(newest.getTime() - ms90);

  const in30 = classified.filter((r) => r.reviewedAt && new Date(r.reviewedAt).getTime() >= cutoff30.getTime());
  const in90 = classified.filter((r) => r.reviewedAt && new Date(r.reviewedAt).getTime() >= cutoff90.getTime());

  const last30Share = classified.length === 0 ? 0 : in30.length / classified.length;
  const last90Share = classified.length === 0 ? 0 : in90.length / classified.length;
  const last30NegativeRatio =
    in30.length === 0 ? null : in30.filter((r) => r.sentiment === "negative").length / in30.length;

  return { hasDates: true, last30Share, last90Share, last30NegativeRatio };
}

function computePriorityScore(stats: Omit<AnalysisStats, "priorityScore">, classified: ClassifiedReview[]): number {
  // 0~100 스케일:
  // - 부정비율/평균별점/리뷰수(volume)
  // - 카테고리 임팩트(품질/CS 가중)
  // - 최근성(최근 30일 비중이 높으면 가중)
  const neg = stats.negativeRatio; // 0..1
  const volume = clamp(Math.log10(stats.total + 1) / 3, 0, 1); // ~0..1
  const ratingPenalty = stats.avgRating === null ? 0.4 : clamp((5 - stats.avgRating) / 4, 0, 1); // 0..1

  const negByCat: Record<Category, number> = { 배송: 0, 품질: 0, 가격: 0, 사용성: 0, CS: 0, 기타: 0 };
  for (const r of classified) if (r.sentiment === "negative") negByCat[r.category] += 1;

  let weightedNeg = 0;
  for (const cat of Object.keys(negByCat) as Category[]) {
    weightedNeg += (negByCat[cat] / Math.max(1, stats.total)) * CATEGORY_IMPACT[cat];
  }
  const impact = clamp(weightedNeg * 2.2, 0, 1); // scale into 0..1-ish

  const recent = stats.recentness?.hasDates ? clamp(stats.recentness.last30Share * 1.4, 0, 1) : 0.5;

  const score = (neg * 0.38 + ratingPenalty * 0.24 + impact * 0.28 + volume * 0.06 + recent * 0.04) * 100;
  return Math.round(score * 10) / 10;
}

export function computeAnalysisFromClassified(classified: ClassifiedReview[]): Pick<AnalysisOutput, "stats" | "classified"> {
  const total = classified.length;
  const positive = classified.filter((r) => r.sentiment === "positive").length;
  const negative = classified.filter((r) => r.sentiment === "negative").length;
  const neutral = total - positive - negative;

  const ratings = classified.map((r) => r.rating).filter((r): r is number => typeof r === "number" && Number.isFinite(r));
  const avgRating = ratings.length === 0 ? null : ratings.reduce((a, b) => a + b, 0) / ratings.length;

  const categoryCounts = { 배송: 0, 품질: 0, 가격: 0, 사용성: 0, CS: 0, 기타: 0 } satisfies Record<Category, number>;
  for (const r of classified) categoryCounts[r.category] += 1;

  const negativeTexts = classified.filter((r) => r.sentiment === "negative").map((r) => r.text);
  const negativeKeywordsTop10 = topKeywords(negativeTexts, 10);

  const recentness = computeRecentness(classified);

  const base: Omit<AnalysisStats, "priorityScore"> = {
    total,
    positive,
    negative,
    neutral,
    positiveRatio: total === 0 ? 0 : positive / total,
    negativeRatio: total === 0 ? 0 : negative / total,
    avgRating,
    negativeKeywordsTop10,
    categoryCounts,
    recentness
  };

  const stats: AnalysisStats = {
    ...base,
    priorityScore: computePriorityScore(base, classified)
  };

  return { stats, classified };
}

export function analyzeReviews(rows: ReviewRow[]): AnalysisOutput {
  const classified = classifyHeuristic(rows);
  const { stats } = computeAnalysisFromClassified(classified);
  return {
    stats,
    suggestions: { detailPageCopy: [], csResponseTemplates: [], faqRecommendations: [], notes: [] },
    classified
  };
}

