import { previewReviewCsv } from "@/lib/csv";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { readUploadedCsvText } from "@/lib/upload_csv";

export const runtime = "nodejs";

const MAX_BYTES = 6 * 1024 * 1024;

export async function POST(req: Request) {
  try {
    const { filename, csvText } = await readUploadedCsvText(req, MAX_BYTES);
    const preview = previewReviewCsv(csvText);
    return Response.json({ filename, ...preview });
  } catch (e: any) {
    if (e instanceof ApiError) return apiErrorResponse(e);
    return apiErrorResponse(
      new ApiError(500, "CSV_PARSE_FAILED", "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.", {
        details: e?.message ?? String(e)
      })
    );
  }
}
