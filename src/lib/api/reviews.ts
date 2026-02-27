export type SavedReviewSummary = {
  id: string;
  createdAt: string;
  filename: string | null;
  totalReviews: number;
  negativeRatio: number | null;
};

export function buildSavedReviewPdfUrl(analysisId: string): string {
  return `/api/report/${encodeURIComponent(analysisId)}`;
}

