import type { CsvMapping, CsvPreview, CsvHeaderMode } from "@/lib/csv";
import type { AnalysisOutput } from "@/lib/types";
import { postBlob, postFormData } from "@/lib/apiClient";

export type AnalysisMapping = Pick<CsvMapping, "headerMode" | "textCol" | "ratingCol" | "dateCol">;

export type DashboardAnalysisMeta = {
  filename: string | null;
  stored: boolean;
  analysisId?: string;
  truncated?: boolean;
  storageAttempted?: boolean;
  storageError?: string | null;
  storageStep?: string | null;
};

export type DashboardAnalysisResult = AnalysisOutput & {
  meta: DashboardAnalysisMeta;
};

export type AnalysisRequestPayload = {
  file: File;
  headerMode?: CsvHeaderMode;
  textCol?: string;
  ratingCol?: string | null;
  dateCol?: string | null;
};

function normalizeMapping(mapping: AnalysisRequestPayload): AnalysisMapping {
  return {
    headerMode: mapping.headerMode ?? "header",
    textCol: mapping.textCol ?? "",
    ratingCol: mapping.ratingCol ?? null,
    dateCol: mapping.dateCol ?? null
  };
}

function buildAnalysisFormData(payload: AnalysisRequestPayload) {
  const fd = new FormData();
  fd.set("file", payload.file);

  const mapping = normalizeMapping(payload);
  fd.set("headerMode", mapping.headerMode);

  if (mapping.textCol) fd.set("textCol", mapping.textCol);
  if (mapping.ratingCol) fd.set("ratingCol", mapping.ratingCol);
  if (mapping.dateCol) fd.set("dateCol", mapping.dateCol);

  return fd;
}

export function createAnalysisResultMeta(): DashboardAnalysisMeta {
  return {
    filename: null,
    stored: false,
    truncated: false,
    storageAttempted: false,
    storageError: null,
    storageStep: null
  };
}

export function isDashboardAnalysisResult(value: unknown): value is DashboardAnalysisResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DashboardAnalysisResult>;
  return (
    "stats" in candidate &&
    "suggestions" in candidate &&
    "classified" in candidate &&
    "meta" in candidate &&
    Boolean(candidate.meta?.filename === null || typeof candidate.meta?.filename === "string")
  );
}

export async function previewCsv(file: File): Promise<CsvPreview> {
  const fd = new FormData();
  fd.set("file", file);
  return postFormData<CsvPreview>("/api/preview", fd);
}

export async function analyzeCsv(payload: AnalysisRequestPayload): Promise<DashboardAnalysisResult> {
  const fd = buildAnalysisFormData(payload);
  return postFormData<DashboardAnalysisResult>("/api/analyze", fd);
}

export async function downloadReportPdf(payload: DashboardAnalysisResult): Promise<Blob> {
  return postBlob<Blob>("/api/report", payload);
}
