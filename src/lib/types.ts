import type { PlanTier } from "@/types/user";

export type { PlanTier };
export * from "@/types/common";
export * from "@/types/review";

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
