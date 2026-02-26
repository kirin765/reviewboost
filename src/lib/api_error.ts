import { ApiErrorBody, ApiErrorCode } from "@/lib/types";

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
  INTERNAL_ERROR: 500,
  PLAN_UPGRADE_REQUIRED: 402,
  MONTHLY_LIMIT_EXCEEDED: 429
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
      ...(e.help?.length ? { help: e.help } : null),
      ...(e.details ? { details: e.details } : null)
    }
  };
  return Response.json(body, { status: e.status, headers: { "cache-control": "no-store" } });
}

export function isApiErrorBody(v: unknown): v is ApiErrorBody {
  if (!v || typeof v !== "object") return false;
  const anyV = v as any;
  if (!anyV.error || typeof anyV.error !== "object") return false;
  if (typeof anyV.error.code !== "string") return false;
  if (typeof anyV.error.message !== "string") return false;
  return true;
}
