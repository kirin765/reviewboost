import { ApiClientError } from "@/lib/apiClient";
import { ApiErrorCode, isApiErrorBody } from "@/lib/api_error";
import { getErrorMessage } from "@/types/common";

export type ApiErrorPayload = {
  status: number;
  code?: ApiErrorCode | string;
  message: string;
  help?: string[];
};

export function normalizeApiError(error: unknown): ApiErrorPayload {
  if (error instanceof ApiClientError) {
    return {
      status: error.status,
      code: error.code,
      message: error.message,
      help: error.help
    };
  }

  if (isApiErrorBody(error)) {
    return {
      status: 400,
      code: error.error.code,
      message: error.error.message,
      help: error.error.help
    };
  }

  return {
    status: 500,
    message: getErrorMessage(error)
  };
}

export class UnexpectedError extends Error {
  status = 500;
  code?: ApiErrorCode | string;
  details?: string;

  constructor(error: unknown) {
    const normalized = normalizeApiError(error);
    super(normalized.message);
    this.code = normalized.code;
    if (normalized.help?.length) {
      this.details = normalized.help.join(" | ");
    }
  }
}

export function handleApiError(error: unknown): never {
  const normalized = normalizeApiError(error);
  if (normalized.code === "PLAN_UPGRADE_REQUIRED") {
    throw new UnexpectedError(`요금제 제한으로 처리할 수 없습니다. (코드: ${normalized.code})`);
  }

  if (normalized.help?.length) {
    throw new UnexpectedError(`${normalized.message} (${normalized.help.join(", ")})`);
  }

  throw new UnexpectedError(normalized.message);
}

