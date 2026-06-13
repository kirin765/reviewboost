import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { logApiError } from "@/lib/api_log";
import { downloadCoupangCsv } from "@/lib/coupang_crawler";
import { getErrorMessage } from "@/types/common";

export const runtime = "nodejs";
export const maxDuration = 300;

type RequestBody = {
  productUrl?: string;
};

function buildContentDisposition(filename: string) {
  const asciiFallback = filename
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/["\\]/g, "-")
    .trim() || "store-reviews.csv";
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`;
}

function buildErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  return "CSV 다운로드 중 내부 오류가 발생했습니다.";
}

export async function POST(req: Request) {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  let body: RequestBody | null = null;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return apiErrorResponse(new ApiError(400, "CRAWLER_PAYLOAD_INVALID", "요청 형식이 올바르지 않습니다."));
  }

  const productUrl = String(body?.productUrl ?? "").trim();
  if (!productUrl) {
    return apiErrorResponse(new ApiError(400, "CRAWLER_PAYLOAD_INVALID", "상품 URL을 입력해주세요."));
  }

  try {
    const { csvBuffer, contentType, filename } = await downloadCoupangCsv({ productUrl });
    return new Response(new Uint8Array(csvBuffer), {
      status: 200,
      headers: {
        "content-type": contentType,
        "content-disposition": buildContentDisposition(filename),
        "cache-control": "no-store"
      }
    });
  } catch (error: unknown) {
    const status = error instanceof ApiError ? error.status : 500;
    await logApiError({
      route: "/api/coupang-csv/download",
      method: req.method,
      status,
      code: error instanceof ApiError ? error.code : "INTERNAL_ERROR",
      message: buildErrorMessage(error),
      details: getErrorMessage(error),
      request: req,
      error
    });

    if (error instanceof ApiError) return apiErrorResponse(error);
    return apiErrorResponse(new ApiError(500, "INTERNAL_ERROR", "CSV 다운로드 중 오류가 발생했습니다."));
  }
}
