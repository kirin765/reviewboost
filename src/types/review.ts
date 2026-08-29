export type Sentiment = "positive" | "negative" | "neutral";

export type Category = "배송" | "품질" | "가격" | "사용성" | "CS" | "기타";

export type ReviewRow = {
  text: string;
  rating: number | null;
  reviewedAt?: string | null;
  /** 스마트스토어 공식 리뷰 엑셀 폼에서 추출한 여분 필드(검수·리서치용). */
  productNo?: string | null;
  productName?: string | null;
  author?: string | null;
  helpfulCount?: number | null;
  hasPhoto?: boolean;
  replyYn?: "Y" | "N" | null;
  bestReviewYn?: "Y" | "N" | null;
};

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
    last30Share: number;
    last90Share: number;
    last30NegativeRatio: number | null;
  };
};

export type Suggestions = {
  detailPageCopy: string[];
  csResponseTemplates: string[];
  faqRecommendations: string[];
  notes: string[];
};

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
  quadrant: "critical" | "monitor" | "review" | "observe";
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
  sentiment: "positive";
};

export type ActionItem = {
  id: string;
  action: string;
  relatedKeyword: string;
  reviewCount: number;
  impact: "high" | "medium" | "low";
  category: "detailPage" | "csResponse" | "faq";
};

// === 스마트스토어 폼 전용: 검수 + 리서치 인사이트 ===

/** 리서치: 상품별 리뷰 분포 한 줄. */
export type SmartstoreProductStat = {
  productName: string;
  reviewCount: number;
  avgRating: number | null;
  negativeRatio: number;
  photoShare: number;
};

/** 검수: 문제 소지가 있는 리뷰 한 건. */
export type SmartstoreScreeningItem = {
  review: ClassifiedReview;
  productName: string | null;
};

/** 리서치: 도움수 상위 리뷰 한 건. */
export type SmartstoreTopHelpful = {
  text: string;
  rating: number | null;
  productName: string | null;
  helpfulCount: number;
};

export type SmartstoreInsights = {
  /** 리서치: 상품별 리뷰 분포(건수 많은 순 상위 10). */
  productStats: SmartstoreProductStat[];
  /** 리서치: 사진/영상 리뷰 비중. */
  photoReviewCount: number;
  photoReviewRatio: number;
  bestReviewCount: number;
  totalHelpful: number;
  topHelpfulReviews: SmartstoreTopHelpful[];
  /** 검수: 답글 없는 부정 리뷰. */
  unrepliedNegativeCount: number;
  unrepliedNegative: SmartstoreScreeningItem[];
  /** 검수: 사진이 붙은 부정 리뷰(공개 노출 리스크). */
  negativeWithPhotoCount: number;
  negativeWithPhoto: SmartstoreScreeningItem[];
};

export type AnalysisOutput = {
  stats: AnalysisStats;
  suggestions: Suggestions;
  classified: ClassifiedReview[];
  urgentReviews?: UrgentReview[];
  priorityMatrix?: PriorityMatrixItem[];
  ratingSimulation?: RatingSimulation;
  positiveKeywords?: PositiveKeyword[];
  actionItems?: ActionItem[];
  /** 스마트스토어 공식 폼 업로드 시에만 채워지는 검수·리서치 인사이트. */
  smartstore?: SmartstoreInsights | null;
};
