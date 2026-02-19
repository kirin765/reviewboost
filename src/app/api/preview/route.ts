import { inferDelimiter, previewReviewCsv } from "@/lib/csv";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { CSV_PARSE_FAILED_HELP } from "@/lib/csv_errors";
import { readUploadedCsvText } from "@/lib/upload_csv";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

function delimiterHint(csvText: string): string[] {
  const delimiter = inferDelimiter(csvText);
  if (delimiter === ",") return [];
  return [
    `구분자가 '${delimiter === "\t" ? "TAB" : delimiter}' 로 감지되었습니다. 엑셀에서 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장하면 가장 안정적입니다.`
  ];
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  try {
    const { filename, csvText } = await readUploadedCsvText(req, MAX_BYTES);
    try {
      const preview = previewReviewCsv(csvText, filename);
      return Response.json(preview);
    } catch (e: any) {
      // Most failures here are user-facing CSV syntax issues (quotes/newlines/delimiter).
      return apiErrorResponse(
        new ApiError(400, "CSV_PARSE_FAILED", "CSV를 읽지 못했어요.", {
          help: [...delimiterHint(csvText), ...CSV_PARSE_FAILED_HELP],
          details: e?.message ?? String(e)
        })
      );
    }
  } catch (e: any) {
    if (e instanceof ApiError) return apiErrorResponse(e);
    return apiErrorResponse(
      new ApiError(500, "CSV_PARSE_FAILED", "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", {
        details: e?.message ?? String(e)
      })
    );
  }
}
