export type AnalysisStage = "collect" | "sentiment" | "category" | "priority" | "done";

export const ANALYSIS_STAGE_ORDER: Exclude<AnalysisStage, "done">[] = ["collect", "sentiment", "category", "priority"];

export const ANALYSIS_STAGE_META: Record<Exclude<AnalysisStage, "done">, { label: string; progress: number }> = {
  collect: { label: "리뷰를 불러오고 있어요...", progress: 26 },
  sentiment: { label: "리뷰의 감정을 분석하고 있어요...", progress: 52 },
  category: { label: "이슈 카테고리를 정리하고 있어요...", progress: 76 },
  priority: { label: "먼저 볼 문제를 계산하고 있어요...", progress: 94 }
};
