import type { DashboardAnalysisResult } from "@/lib/api/analysis";
import type { ActionItem, AnalysisOutput, Category, PriorityMatrixItem, UrgentReview } from "@/lib/types";

export type DashboardMetricView = {
  label: string;
  value: string;
  detail: string;
};

export type DashboardCategoryView = {
  key: Category;
  count: number;
  percentage: number;
  impact: number;
  actionSummary: string;
  urgentReviews: UrgentReview[];
};

export type DashboardPriorityRow = {
  category: Category;
  share: string;
  impact: number;
  actionSummary: string;
  quadrant: PriorityMatrixItem["quadrant"];
};

export type DashboardSimulationTile = {
  label: string;
  value: string;
  delta: string;
  relatedKeywords: string[];
};

export type DashboardKeywordView = {
  keyword: string;
  count: number;
};

export type DashboardActionView = {
  id: string;
  impact: ActionItem["impact"];
  category: ActionItem["category"];
  action: string;
  reviewCount: number;
  relatedKeyword: string;
};

export type DashboardViewModel = {
  summaryMetrics: DashboardMetricView[];
  categories: DashboardCategoryView[];
  priorities: DashboardPriorityRow[];
  keywords: DashboardKeywordView[];
  simulations: DashboardSimulationTile[];
  actionItems: DashboardActionView[];
};

const CATEGORY_ORDER: Category[] = ["배송", "품질", "사용성", "CS", "가격", "기타"];

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) return "-";
  return `${(value * 100).toFixed(0)}%`;
}

function toShare(count: number, total: number) {
  if (!total) return 0;
  return Number(((count / total) * 100).toFixed(1));
}

function sortPriorityMatrix(matrix: PriorityMatrixItem[] | undefined) {
  return [...(matrix ?? [])].sort((left, right) => {
    const leftScore = left.impact * left.frequencyPct;
    const rightScore = right.impact * right.frequencyPct;
    return rightScore - leftScore;
  });
}

export function mapDashboardViewModel(result: Pick<DashboardAnalysisResult, keyof AnalysisOutput | "meta">): DashboardViewModel {
  const total = result.stats.total || 0;
  const priorities = sortPriorityMatrix(result.priorityMatrix);
  const categoryImpactMap = new Map(priorities.map((item) => [item.category, item]));

  const categories = CATEGORY_ORDER.map((category) => {
    const count = result.stats.categoryCounts?.[category] ?? 0;
    const priority = categoryImpactMap.get(category);
    const urgentReviews = (result.urgentReviews ?? []).filter((entry) => entry.review.category === category);

    return {
      key: category,
      count,
      percentage: toShare(count, total),
      impact: priority?.impact ?? 0,
      actionSummary: priority?.actionSummary ?? "세부 액션 요약이 아직 없습니다.",
      urgentReviews
    };
  });

  return {
    summaryMetrics: [
      {
        label: "부정 비율",
        value: formatPercent(result.stats.negativeRatio),
        detail: `부정 ${result.stats.negative ?? 0}건`
      },
      {
        label: "평균 별점",
        value: result.stats.avgRating === null ? "미기재" : `${result.stats.avgRating.toFixed(2)} / 5`,
        detail: "별점 열 기준"
      },
      {
        label: "우선순위 점수",
        value: result.stats.priorityScore.toFixed(1),
        detail: "지금 먼저 고칠 가치"
      },
      {
        label: "최근 30일 비중",
        value: result.stats.recentness?.hasDates ? formatPercent(result.stats.recentness.last30Share) : "날짜 없음",
        detail: result.stats.recentness?.hasDates ? "최근 30일 비중" : "작성일 열 필요"
      }
    ],
    categories,
    priorities: priorities.map((item) => ({
      category: item.category,
      share: `${item.frequencyPct.toFixed(1)}%`,
      impact: item.impact,
      actionSummary: item.actionSummary,
      quadrant: item.quadrant
    })),
    keywords: (result.stats.negativeKeywordsTop10 ?? []).map((item) => ({
      keyword: item.keyword,
      count: item.count
    })),
    simulations: (result.ratingSimulation?.scenarios ?? []).map((item) => ({
      label: item.label,
      value: item.newAvg.toFixed(2),
      delta: `${item.delta >= 0 ? "+" : ""}${item.delta.toFixed(2)}`,
      relatedKeywords: item.relatedKeywords
    })),
    actionItems: (result.actionItems ?? []).map((item) => ({
      id: item.id,
      impact: item.impact,
      category: item.category,
      action: item.action,
      reviewCount: item.reviewCount,
      relatedKeyword: item.relatedKeyword
    }))
  };
}
