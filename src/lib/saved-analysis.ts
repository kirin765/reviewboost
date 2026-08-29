import type { DashboardAnalysisResult } from "@/lib/api/analysis";
import type {
  ActionItem,
  AnalysisStats,
  AnalysisOutput,
  Category,
  ClassifiedReview,
  PriorityMatrixItem,
  PositiveKeyword,
  RatingSimulation,
  Suggestions,
  UrgentReview
} from "@/lib/types";

const CATEGORY_ORDER: Category[] = ["배송", "품질", "사용성", "CS", "가격", "기타"];

export type StoredAnalysisResultPayload = Omit<DashboardAnalysisResult, "meta">;

export type SavedAnalysisDetailRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number | null;
  stats: AnalysisOutput["stats"] | null;
  suggestions: Suggestions | null;
  result_payload?: StoredAnalysisResultPayload | null;
};

export type SavedAnalysisReviewRow = {
  id: string;
  reviewed_at: string | null;
  rating: number | null;
  text: string;
  sentiment: ClassifiedReview["sentiment"];
  category: Category;
};

export type LegacySavedAnalysisView = {
  summary: Array<{ label: string; value: string; detail: string }>;
  categories: Array<{ label: Category; count: number; share: string }>;
  reviews: Array<{
    id: string;
    category: Category;
    sentiment: ClassifiedReview["sentiment"];
    ratingLabel: string;
    reviewedLabel: string;
    text: string;
  }>;
  suggestionGroups: Array<{ title: string; items: string[] }>;
};

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "날짜 없음";
  return new Date(value).toLocaleString("ko-KR");
}

function ensureSuggestions(suggestions: Suggestions | null | undefined): Suggestions {
  return suggestions ?? {
    detailPageCopy: [],
    csResponseTemplates: [],
    faqRecommendations: [],
    notes: []
  };
}

function emptyCategoryCounts(): Record<Category, number> {
  return {
    배송: 0,
    품질: 0,
    사용성: 0,
    CS: 0,
    가격: 0,
    기타: 0
  };
}

function deriveStatsFromReviews(row: SavedAnalysisDetailRow, reviews: SavedAnalysisReviewRow[]): AnalysisStats {
  const total = reviews.length;
  const negative = reviews.filter((review) => review.sentiment === "negative").length;
  const positive = reviews.filter((review) => review.sentiment === "positive").length;
  const neutral = Math.max(0, total - negative - positive);
  const ratings = reviews.map((review) => review.rating).filter((rating): rating is number => typeof rating === "number");
  const avgRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
  const categoryCounts = reviews.reduce<Record<Category, number>>((counts, review) => {
    counts[review.category] += 1;
    return counts;
  }, emptyCategoryCounts());
  const datedReviews = reviews.filter((review) => review.reviewed_at).map((review) => ({
    ...review,
    reviewed_at: review.reviewed_at as string
  }));
  const now = Date.now();
  const within30Days = datedReviews.filter((review) => now - new Date(review.reviewed_at).getTime() <= 1000 * 60 * 60 * 24 * 30);
  const within90Days = datedReviews.filter((review) => now - new Date(review.reviewed_at).getTime() <= 1000 * 60 * 60 * 24 * 90);

  return {
    total,
    positive,
    negative,
    neutral,
    positiveRatio: total > 0 ? positive / total : 0,
    negativeRatio: total > 0 ? negative / total : 0,
    avgRating,
    negativeKeywordsTop10: [],
    categoryCounts,
    priorityScore: Number(row.priority_score ?? 0),
    recentness: {
      hasDates: datedReviews.length > 0,
      last30Share: total > 0 ? within30Days.length / total : 0,
      last90Share: total > 0 ? within90Days.length / total : 0,
      last30NegativeRatio: within30Days.length > 0 ? within30Days.filter((review) => review.sentiment === "negative").length / within30Days.length : null
    }
  };
}

function ensureLegacyStats(row: SavedAnalysisDetailRow, reviews: SavedAnalysisReviewRow[]): AnalysisStats {
  if (!row.stats) return deriveStatsFromReviews(row, reviews);

  return {
    total: Number(row.stats.total ?? reviews.length),
    positive: Number(row.stats.positive ?? reviews.filter((review) => review.sentiment === "positive").length),
    negative: Number(row.stats.negative ?? reviews.filter((review) => review.sentiment === "negative").length),
    neutral: Number(
      row.stats.neutral ??
        Math.max(
          0,
          Number(row.stats.total ?? reviews.length) -
            Number(row.stats.positive ?? reviews.filter((review) => review.sentiment === "positive").length) -
            Number(row.stats.negative ?? reviews.filter((review) => review.sentiment === "negative").length)
        )
    ),
    positiveRatio: Number(row.stats.positiveRatio ?? 0),
    negativeRatio: Number(row.stats.negativeRatio ?? 0),
    avgRating: typeof row.stats.avgRating === "number" ? row.stats.avgRating : null,
    negativeKeywordsTop10: row.stats.negativeKeywordsTop10 ?? [],
    categoryCounts: row.stats.categoryCounts ?? emptyCategoryCounts(),
    priorityScore: Number(row.stats.priorityScore ?? row.priority_score ?? 0),
    recentness: row.stats.recentness ?? deriveStatsFromReviews(row, reviews).recentness
  };
}

export function mapSavedAnalysisResult(row: SavedAnalysisDetailRow): DashboardAnalysisResult | null {
  if (!row.result_payload) return null;

  return {
    ...row.result_payload,
    stats: row.result_payload.stats ?? row.stats ?? row.result_payload.stats,
    suggestions: row.result_payload.suggestions ?? ensureSuggestions(row.suggestions),
    meta: {
      filename: row.input_filename,
      stored: true,
      analysisId: row.id,
      truncated: false
    }
  };
}

export function mapLegacySavedAnalysisResult(row: SavedAnalysisDetailRow, reviews: SavedAnalysisReviewRow[]): DashboardAnalysisResult {
  const stats = ensureLegacyStats(row, reviews);
  const suggestions = ensureSuggestions(row.suggestions);
  const urgentReviews = deriveUrgentReviewsFromSavedReviews(reviews);
  const priorityMatrix = derivePriorityMatrixFromStats({ ...row, stats });
  const actionItems = deriveActionItemsFromSuggestions(suggestions);
  const ratingSimulation: RatingSimulation = {
    currentAvg: typeof stats.avgRating === "number" ? stats.avgRating : 0,
    scenarios: []
  };
  const positiveKeywords: PositiveKeyword[] = [];
  const classified: ClassifiedReview[] = reviews.map((review) => ({
    text: review.text,
    rating: review.rating,
    reviewedAt: review.reviewed_at,
    sentiment: review.sentiment,
    category: review.category
  }));

  return {
    stats,
    suggestions,
    classified,
    urgentReviews,
    priorityMatrix,
    ratingSimulation,
    positiveKeywords,
    actionItems,
    meta: {
      filename: row.input_filename,
      stored: true,
      analysisId: row.id,
      truncated: false
    }
  };
}

export function mapLegacySavedAnalysisView(row: SavedAnalysisDetailRow, reviews: SavedAnalysisReviewRow[]): LegacySavedAnalysisView {
  const stats = row.stats;
  const total = Number(stats?.total ?? 0);
  const suggestions = ensureSuggestions(row.suggestions);
  const categories = CATEGORY_ORDER.map((label) => {
    const count = Number(stats?.categoryCounts?.[label] ?? 0);
    const share = total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "0%";
    return { label, count, share };
  });

  const sortedReviews = [...reviews].sort((left, right) => {
    const leftNegativeBoost = left.sentiment === "negative" ? -1 : 0;
    const rightNegativeBoost = right.sentiment === "negative" ? -1 : 0;
    if (leftNegativeBoost !== rightNegativeBoost) return leftNegativeBoost - rightNegativeBoost;

    const leftDate = left.reviewed_at ? new Date(left.reviewed_at).getTime() : 0;
    const rightDate = right.reviewed_at ? new Date(right.reviewed_at).getTime() : 0;
    return rightDate - leftDate;
  });

  return {
    summary: [
      {
        label: "총 리뷰",
        value: `${total}건`,
        detail: row.input_filename ?? "저장된 CSV"
      },
      {
        label: "부정 비율",
        value: formatPercent(stats?.negativeRatio),
        detail: `부정 ${Number(stats?.negative ?? 0)}건`
      },
      {
        label: "평균 별점",
        value: typeof stats?.avgRating === "number" ? `${stats.avgRating.toFixed(2)} / 5` : "미기재",
        detail: "별점 열이 있을 때 계산"
      },
      {
        label: "최근 30일 비중",
        value: stats?.recentness?.hasDates ? formatPercent(stats.recentness.last30Share) : "날짜 없음",
        detail: stats?.recentness?.hasDates ? "최근성 반영" : "작성일 열 없음"
      }
    ],
    categories,
    reviews: sortedReviews.slice(0, 24).map((review) => ({
      id: review.id,
      category: review.category,
      sentiment: review.sentiment,
      ratingLabel: review.rating === null ? "미기재" : `${review.rating}점`,
      reviewedLabel: formatDate(review.reviewed_at),
      text: review.text
    })),
    suggestionGroups: [
      { title: "상세페이지 반영", items: suggestions.detailPageCopy },
      { title: "CS 응대 템플릿", items: suggestions.csResponseTemplates },
      { title: "FAQ 추천", items: suggestions.faqRecommendations },
      { title: "메모", items: suggestions.notes }
    ]
  };
}

export function createStoredAnalysisPayload(result: DashboardAnalysisResult): StoredAnalysisResultPayload {
  const {
    stats,
    suggestions,
    classified,
    urgentReviews,
    priorityMatrix,
    ratingSimulation,
    positiveKeywords,
    actionItems,
    smartstore
  } = result;

  return {
    stats,
    suggestions,
    classified,
    urgentReviews,
    priorityMatrix,
    ratingSimulation,
    positiveKeywords,
    actionItems,
    smartstore
  };
}

export function deriveUrgentReviewsFromSavedReviews(reviews: SavedAnalysisReviewRow[]): UrgentReview[] {
  return reviews
    .filter((review) => review.sentiment === "negative")
    .slice(0, 8)
    .map((review) => ({
      review: {
        text: review.text,
        rating: review.rating,
        reviewedAt: review.reviewed_at,
        sentiment: review.sentiment,
        category: review.category
      },
      highlightedText: review.text,
      daysSinceWritten: review.reviewed_at
        ? Math.max(0, Math.floor((Date.now() - new Date(review.reviewed_at).getTime()) / (1000 * 60 * 60 * 24)))
        : null
    }));
}

export function derivePriorityMatrixFromStats(row: SavedAnalysisDetailRow): PriorityMatrixItem[] {
  const stats = row.stats;
  const total = Number(stats?.total ?? 0);

  return CATEGORY_ORDER.map((category) => {
    const frequency = Number(stats?.categoryCounts?.[category] ?? 0);
    const frequencyPct = total > 0 ? Number(((frequency / total) * 100).toFixed(1)) : 0;
    const impact = category === "품질" ? 9 : category === "배송" || category === "사용성" ? 7 : category === "CS" ? 8 : category === "가격" ? 6 : 4;
    const score = frequencyPct * impact;

    return {
      category,
      frequency,
      frequencyPct,
      impact,
      quadrant: (score >= 180 ? "critical" : score >= 90 ? "monitor" : frequency > 0 ? "review" : "observe") as PriorityMatrixItem["quadrant"],
      actionSummary: `${category} 이슈를 다시 검토해 저장된 상세 제안과 함께 운영 우선순위를 정리하세요.`
    };
  }).filter((item) => item.frequency > 0);
}

export function deriveActionItemsFromSuggestions(suggestions: Suggestions): ActionItem[] {
  const groups: Array<{ category: ActionItem["category"]; impact: ActionItem["impact"]; source: string[] }> = [
    { category: "detailPage", impact: "high", source: suggestions.detailPageCopy },
    { category: "csResponse", impact: "medium", source: suggestions.csResponseTemplates },
    { category: "faq", impact: "low", source: suggestions.faqRecommendations }
  ];

  return groups.flatMap((group, groupIndex) =>
    group.source.slice(0, 3).map((action, itemIndex) => ({
      id: `${group.category}-${groupIndex}-${itemIndex}`,
      action,
      relatedKeyword: "",
      reviewCount: 0,
      impact: group.impact,
      category: group.category
    }))
  );
}
