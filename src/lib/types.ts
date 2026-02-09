export type ReviewRow = {
  text: string;
  rating: number | null;
  reviewedAt?: string | null; // ISO timestamp if available in CSV
};

export type Sentiment = "positive" | "negative" | "neutral";

export type Category = "배송" | "품질" | "가격" | "사용성" | "CS" | "기타";

export type ClassifiedReview = ReviewRow & {
  sentiment: Sentiment;
  category: Category;
};

export type AnalysisStats = {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  positiveRatio: number;
  negativeRatio: number;
  avgRating: number | null;
  negativeKeywordsTop10: Array<{ keyword: string; count: number }>;
  categoryCounts: Record<Category, number>;
  priorityScore: number;
  recentness?: {
    hasDates: boolean;
    last30Share: number; // 0..1
    last90Share: number; // 0..1
    last30NegativeRatio: number | null; // null if insufficient last30 data
  };
};

export type Suggestions = {
  detailPageCopy: string[];
  csResponseTemplates: string[];
  faqRecommendations: string[];
  notes: string[];
};

export type AnalysisOutput = {
  stats: AnalysisStats;
  suggestions: Suggestions;
  classified: ClassifiedReview[];
};
