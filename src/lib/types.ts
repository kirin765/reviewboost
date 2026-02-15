export type PlanTier = "free" | "basic" | "pro";

export type PlanGates = {
  plan: PlanTier;
  monthlyAnalysisLimit: number;
  maxReviewsPerAnalysis: number;
  allowLLM: boolean;
  negativeKeywordVisibleCount: number;
  urgentReviewVisibleCount: number;
  actionItemVisibleCount: number;
  showPriorityActionSummary: boolean;
  showRatingSimulation: boolean;
  showPositiveKeywords: boolean;
  pdfWatermark: boolean;
  pdfFullSections: boolean;
  pdfBrandLogo: boolean;
  historyLimit: number;
  csvRetentionDays: number;
  teamSeats: number;
  shareableLinks: boolean;
};

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

// === V2 New Types ===

export type UrgentReview = {
  review: ClassifiedReview;
  highlightedText: string;
  daysSinceWritten: number | null;
};

export type PriorityMatrixItem = {
  category: Category;
  frequency: number;
  frequencyPct: number;
  impact: number;
  quadrant: 'critical' | 'monitor' | 'review' | 'observe';
  actionSummary: string;
};

export type SimulationScenario = {
  label: string;
  resolvedCount: number;
  newAvg: number;
  delta: number;
  relatedKeywords: string[];
};

export type RatingSimulation = {
  currentAvg: number;
  scenarios: SimulationScenario[];
};

export type PositiveKeyword = {
  keyword: string;
  count: number;
  sentiment: 'positive';
};

export type ActionItem = {
  id: string;
  action: string;
  relatedKeyword: string;
  reviewCount: number;
  impact: 'high' | 'medium' | 'low';
  category: 'detailPage' | 'csResponse' | 'faq';
};

export type AnalysisOutput = {
  stats: AnalysisStats;
  suggestions: Suggestions;
  classified: ClassifiedReview[];
  // V2 optional fields
  urgentReviews?: UrgentReview[];
  priorityMatrix?: PriorityMatrixItem[];
  ratingSimulation?: RatingSimulation;
  positiveKeywords?: PositiveKeyword[];
  actionItems?: ActionItem[];
};
