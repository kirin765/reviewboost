import { ApiClientError } from "@/lib/apiClient";
import { isApiErrorBody } from "@/lib/api_error";

export type CoupangCsvDownloadPayload = {
  productUrl: string;
};

export type CoupangCsvDownloadResponse = {
  blob: Blob;
  filename: string;
};

function parseFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;

  const filenameStar = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition)?.[1];
  if (filenameStar) {
    try {
      return decodeURIComponent(filenameStar);
    } catch {
      return filenameStar;
    }
  }

  return /filename\s*=\s*("?)([^";]+)\1/i.exec(contentDisposition)?.[2] ?? null;
}

export async function downloadCoupangCsv(payload: CoupangCsvDownloadPayload): Promise<CoupangCsvDownloadResponse> {
  const response = await fetch("/api/coupang-csv/download", {
    method: "POST",
    headers: {
      Accept: "text/csv,application/octet-stream,*/*",
      "content-type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let fallback = response.statusText || "요청 처리 중 오류가 발생했습니다.";
    try {
      const json = (await response.json()) as unknown;
      if (isApiErrorBody(json)) {
        throw new ApiClientError(json.error.message, response.status, json.error.code, json.error.help, json.error.details);
      }
    } catch (error) {
      if (error instanceof ApiClientError) throw error;
      // Keep fallback.
    }
    throw new ApiClientError(fallback, response.status);
  }

  const blob = await response.blob();
  const filename = parseFilename(response.headers.get("content-disposition")) ?? `coupang-reviews-${Date.now()}.csv`;
  return { blob, filename };
}
