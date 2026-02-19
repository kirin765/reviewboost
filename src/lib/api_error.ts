export type ApiErrorCode =
  | "UPLOAD_BAD_CONTENT_TYPE"
  | "UPLOAD_MISSING_FILE"
  | "UPLOAD_UNREADABLE_FILE"
  | "CSV_NOT_CSV"
  | "CSV_EMPTY"
  | "CSV_TOO_LARGE"
  | "CSV_ENCODING"
  | "CSV_PARSE_FAILED"
  | "INTERNAL_ERROR"
  | "PLAN_UPGRADE_REQUIRED"
  | "MONTHLY_LIMIT_EXCEEDED";

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
