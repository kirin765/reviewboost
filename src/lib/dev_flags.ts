export type DevAnalysisMode = "auto" | "heuristic" | "llm";

function parseBool(raw: string | undefined): boolean | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase();
  if (!v) return null;
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return null;
}

export function devAllowAdvancedAiBypass(): boolean {
  return parseBool(process.env.DEV_ALLOW_ADVANCED_AI) === true;
}

export function devForcedAnalysisMode(): DevAnalysisMode {
  const raw = String(process.env.DEV_FORCE_ANALYSIS_MODE ?? "")
    .trim()
    .toLowerCase();
  if (raw === "heuristic") return "heuristic";
  if (raw === "llm") return "llm";
  return "auto";
}
