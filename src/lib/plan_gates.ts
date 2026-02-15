import type { PlanGates, PlanTier } from "./types";

export const FREE_GATES: PlanGates = {
  plan: "free",
  monthlyAnalysisLimit: 5,
  maxReviewsPerAnalysis: 50,
  allowLLM: false,
  negativeKeywordVisibleCount: 5,
  urgentReviewVisibleCount: 3,
  actionItemVisibleCount: 3,
  showPriorityActionSummary: false,
  showRatingSimulation: false,
  showPositiveKeywords: false,
  pdfWatermark: true,
  pdfFullSections: false,
  pdfBrandLogo: false,
  historyLimit: 3,
  csvRetentionDays: 7,
  teamSeats: 1,
  shareableLinks: false,
};

export const BASIC_GATES: PlanGates = {
  plan: "basic",
  monthlyAnalysisLimit: 200,
  maxReviewsPerAnalysis: 500,
  allowLLM: true,
  negativeKeywordVisibleCount: 10,
  urgentReviewVisibleCount: 10,
  actionItemVisibleCount: 10,
  showPriorityActionSummary: true,
  showRatingSimulation: false,
  showPositiveKeywords: false,
  pdfWatermark: false,
  pdfFullSections: true,
  pdfBrandLogo: false,
  historyLimit: 500,
  csvRetentionDays: 90,
  teamSeats: 1,
  shareableLinks: true,
};

export const PRO_GATES: PlanGates = {
  plan: "pro",
  monthlyAnalysisLimit: 1000,
  maxReviewsPerAnalysis: 2000,
  allowLLM: true,
  negativeKeywordVisibleCount: 10,
  urgentReviewVisibleCount: 10,
  actionItemVisibleCount: 10,
  showPriorityActionSummary: true,
  showRatingSimulation: true,
  showPositiveKeywords: true,
  pdfWatermark: false,
  pdfFullSections: true,
  pdfBrandLogo: true,
  historyLimit: 1500,
  csvRetentionDays: 365,
  teamSeats: 5,
  shareableLinks: true,
};

export function getGatesForPlan(plan: PlanTier): PlanGates {
  switch (plan) {
    case "pro":
      return PRO_GATES;
    case "basic":
      return BASIC_GATES;
    default:
      return FREE_GATES;
  }
}
