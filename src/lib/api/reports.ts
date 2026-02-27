import { getBlob, get } from "@/lib/apiClient";

export type ReportDownloadPayload = {
  analysisId: string;
};

export async function downloadReportPdf(analysisId: string): Promise<Blob> {
  return getBlob(`/api/report/${encodeURIComponent(analysisId)}`);
}

export async function reportEndpointHealth(): Promise<{ ok: boolean; method: string }> {
  return get<{ ok: boolean; method: string }>("/api/report", { check: "1" });
}

