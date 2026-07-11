export type ApiErrorCode =
  | "UPLOAD_BAD_CONTENT_TYPE"
  | "UPLOAD_MISSING_FILE"
  | "UPLOAD_UNREADABLE_FILE"
  | "CSV_NOT_CSV"
  | "CSV_EMPTY"
  | "CSV_TOO_LARGE"
  | "CSV_ENCODING"
  | "CSV_PARSE_FAILED"
  | "CSV_PARSE_INVALID"
  | "ANALYZE_PAYLOAD_INVALID"
  | "LLM_TIMEOUT"
  | "ANALYZE_PERSISTENCE_FAILED"
  | "INTERNAL_ERROR"
  | "PLAN_UPGRADE_REQUIRED"
  | "MONTHLY_LIMIT_EXCEEDED"
  | "QUOTA_CHECK_UNAVAILABLE"
  | "CRAWLER_PAYLOAD_INVALID"
  | "CRAWLER_NOT_CONFIGURED"
  | "CRAWLER_INVALID_PRODUCT_URL"
  | "CRAWLER_UPSTREAM_TIMEOUT"
  | "CRAWLER_UPSTREAM_ERROR"
  | "CRAWLER_INVALID_RESPONSE";

export type ApiErrorStatusMap = Record<ApiErrorCode, number>;

export const apiErrorStatus: ApiErrorStatusMap = {
  UPLOAD_BAD_CONTENT_TYPE: 415,
  UPLOAD_MISSING_FILE: 400,
  UPLOAD_UNREADABLE_FILE: 400,
  CSV_NOT_CSV: 400,
  CSV_EMPTY: 400,
  CSV_TOO_LARGE: 413,
  CSV_ENCODING: 400,
  CSV_PARSE_FAILED: 400,
  CSV_PARSE_INVALID: 400,
  ANALYZE_PAYLOAD_INVALID: 400,
  LLM_TIMEOUT: 408,
  ANALYZE_PERSISTENCE_FAILED: 500,
  INTERNAL_ERROR: 500,
  PLAN_UPGRADE_REQUIRED: 403,
  MONTHLY_LIMIT_EXCEEDED: 429,
  QUOTA_CHECK_UNAVAILABLE: 503,
  CRAWLER_PAYLOAD_INVALID: 400,
  CRAWLER_NOT_CONFIGURED: 503,
  CRAWLER_INVALID_PRODUCT_URL: 400,
  CRAWLER_UPSTREAM_TIMEOUT: 504,
  CRAWLER_UPSTREAM_ERROR: 502,
  CRAWLER_INVALID_RESPONSE: 502
} as const;

export type ApiErrorBody = {
  error: {
    code: ApiErrorCode;
    message: string;
    help?: string[];
    details?: string;
  };
};

export class ApiError extends Error {
  status: number;
  code: ApiErrorCode;
  help?: string[];
  details?: string;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    opts?: { help?: string[]; details?: string }
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.help = opts?.help;
    this.details = opts?.details;
  }
}

export function apiErrorResponse(e: ApiError): Response {
  const body: ApiErrorBody = {
    error: {
      code: e.code,
      message: e.message,
      ...(e.help?.length ? { help: e.help } : {}),
      ...(e.details ? { details: e.details } : {})
    }
  };
  return Response.json(body, { status: e.status, headers: { "cache-control": "no-store" } });
}

export function isApiErrorBody(v: unknown): v is ApiErrorBody {
  if (!v || typeof v !== "object") return false;
  const container = v as Record<string, unknown>;
  const error = container.error;
  if (!error || typeof error !== "object") return false;
  const errorBody = error as Record<string, unknown>;
  if (typeof errorBody.code !== "string") return false;
  if (typeof errorBody.message !== "string") return false;
  if (errorBody.help !== undefined && !Array.isArray(errorBody.help)) return false;
  if (errorBody.details !== undefined && typeof errorBody.details !== "string") return false;
  return true;
}
