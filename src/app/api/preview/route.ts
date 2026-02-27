import { inferDelimiter, previewReviewCsv } from "@/lib/csv";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { CSV_PARSE_FAILED_HELP } from "@/lib/csv_errors";
import { readUploadedCsvText } from "@/lib/upload_csv";
import { logApiError } from "@/lib/api_log";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { getErrorMessage } from "@/types/common";

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
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      // Most failures here are user-facing CSV syntax issues (quotes/newlines/delimiter).
      await logApiError({
        route: "/api/preview",
        method: req.method,
        status: 400,
        code: "CSV_PARSE_FAILED",
        message: "CSV 파싱에 실패했습니다.",
        details: message,
        request: req,
        error: e,
        extra: { filename, stage: "parse_preview" }
      });
      return apiErrorResponse(
        new ApiError(400, "CSV_PARSE_FAILED", "CSV를 읽지 못했어요.", {
          help: [...delimiterHint(csvText), ...CSV_PARSE_FAILED_HELP],
          details: message
        })
      );
    }
  } catch (e: unknown) {
    const message = getErrorMessage(e);
    await logApiError({
      route: "/api/preview",
      method: req.method,
      status: e instanceof ApiError ? e.status : 500,
      code: e instanceof ApiError ? e.code : "INTERNAL_ERROR",
      message: e instanceof ApiError ? e.message : "CSV 업로드 미리보기 처리 중 오류가 발생했습니다.",
      details: message,
      request: req,
      error: e
    });
    if (e instanceof ApiError) return apiErrorResponse(e);
    return apiErrorResponse(
      new ApiError(e instanceof ApiError ? e.status : 500, "INTERNAL_ERROR", "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", {
        details: message
      })
    );
  }
}
