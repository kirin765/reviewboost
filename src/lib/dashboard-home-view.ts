type AnalysisStats = {
  total?: number;
  negative?: number;
  negativeRatio?: number;
  avgRating?: number | null;
  recentness?: {
    hasDates?: boolean;
    last30Share?: number;
  } | null;
} | null;

export type DashboardHomeAnalysisRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number | null;
  stats: AnalysisStats;
};

export type DashboardHomeReportItem = {
  id: string;
  href: string;
  title: string;
  createdLabel: string;
  totalReviewsLabel: string;
  negativeRateLabel: string;
  priorityLabel: string;
};

export type DashboardHomeView = {
  totalReviews: number;
  negativeRate: number | null;
  averageRating: number | null;
  recent30DayWeight: number | null;
  recentReports: DashboardHomeReportItem[];
};

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

export function mapDashboardHomeView(rows: DashboardHomeAnalysisRow[]): DashboardHomeView {
  let totalReviews = 0;
  let negativeCount = 0;
  let negativeWeightBase = 0;
  let ratingWeighted = 0;
  let ratingWeightBase = 0;
  let recentWeighted = 0;
  let recentWeightBase = 0;

  rows.forEach((row) => {
    const stats = row.stats;
    const total = Number(stats?.total ?? 0);
    totalReviews += total;

    if (typeof stats?.negative === "number") {
      negativeCount += stats.negative;
      negativeWeightBase += total;
    } else if (typeof stats?.negativeRatio === "number" && total > 0) {
      negativeCount += stats.negativeRatio * total;
      negativeWeightBase += total;
    }

    if (typeof stats?.avgRating === "number" && total > 0) {
      ratingWeighted += stats.avgRating * total;
      ratingWeightBase += total;
    }

    if (stats?.recentness?.hasDates && typeof stats.recentness.last30Share === "number" && total > 0) {
      recentWeighted += stats.recentness.last30Share * total;
      recentWeightBase += total;
    }
  });

  return {
    totalReviews,
    negativeRate: negativeWeightBase > 0 ? negativeCount / negativeWeightBase : null,
    averageRating: ratingWeightBase > 0 ? ratingWeighted / ratingWeightBase : null,
    recent30DayWeight: recentWeightBase > 0 ? recentWeighted / recentWeightBase : null,
    recentReports: rows.map((row) => ({
      id: row.id,
      href: `/dashboard/analysis/${row.id}`,
      title: row.input_filename ?? "CSV",
      createdLabel: formatDateTime(row.created_at),
      totalReviewsLabel: `${Number(row.stats?.total ?? 0)}건`,
      negativeRateLabel: formatPercent(typeof row.stats?.negativeRatio === "number" ? row.stats.negativeRatio : null),
      priorityLabel: Number(row.priority_score ?? 0).toFixed(1)
    }))
  };
}
