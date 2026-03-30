export type AnalysisStage = "collect" | "sentiment" | "category" | "priority" | "done";

export const ANALYSIS_STAGE_ORDER: Exclude<AnalysisStage, "done">[] = ["collect", "sentiment", "category", "priority"];
