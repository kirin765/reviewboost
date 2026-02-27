import { ApiErrorCode, isApiErrorBody } from "@/lib/api_error";

type ApiParams = Record<string, string | number | boolean>;

export type ApiClientErrorCode = ApiErrorCode | string;

export class ApiClientError extends Error {
  status: number;
  code?: ApiClientErrorCode;
  help?: string[];
  details?: string;

  constructor(message: string, status: number, code?: ApiClientErrorCode, help?: string[], details?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.help = help;
    this.details = details;
  }
}

function cleanPath(path: string) {
  if (path.startsWith("/api/")) return path;
  if (path.startsWith("/")) return `/api${path}`;
  return `/api/${path}`;
}

function buildUrl(path: string, params?: ApiParams): string {
  const apiPath = cleanPath(path);
  if (!params || Object.keys(params).length === 0) return apiPath;

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }

  return `${apiPath}?${search.toString()}`;
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const ct = response.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) return null;
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildClientError(response: Response, payload: unknown): ApiClientError {
  if (isApiErrorBody(payload)) {
    return new ApiClientError(payload.error.message, response.status, payload.error.code, payload.error.help, payload.error.details);
  }

  return new ApiClientError(response.statusText || "요청 처리 중 오류가 발생했습니다.", response.status);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204 || response.status === 205) return undefined as T;

  const payload = await parseJsonBody(response);
  if (!response.ok) {
    throw buildClientError(response, payload);
  }

  if (payload === null) {
    throw new ApiClientError("응답 본문이 비정상입니다.", response.status);
  }

  return payload as T;
}

type ApiCallOptions = Omit<RequestInit, "body" | "method"> & {
  params?: ApiParams;
};

async function requestJson<T>(method: string, path: string, init: RequestInit = {}): Promise<T> {
  const { params, ...rest } = init as ApiCallOptions;
  const url = buildUrl(path, params);

  const response = await fetch(url, {
    method,
    ...rest,
    headers: {
      Accept: "application/json",
      ...(init.headers ?? {})
    }
  });

  return handleResponse<T>(response);
}

export function get<T>(path: string, params?: ApiParams): Promise<T> {
  return requestJson("GET", path, { params });
}

export function post<T>(path: string, body?: unknown, options?: Omit<ApiCallOptions, "params">): Promise<T> {
  const requestBody = body === undefined ? undefined : JSON.stringify(body);
  return requestJson<T>("POST", path, {
    ...options,
    body: requestBody,
    headers: {
      "content-type": "application/json",
      ...(options?.headers ?? {})
    }
  });
}

export function postFormData<T>(path: string, formData: FormData): Promise<T> {
  return requestJson<T>("POST", path, {
    body: formData
  });
}

export async function postBlob<T>(path: string, body: unknown, options?: Omit<ApiCallOptions, "params">): Promise<T> {
  const requestBody = body === undefined ? undefined : JSON.stringify(body);

  const response = await fetch(buildUrl(path, options?.params), {
    method: "POST",
    ...options,
    headers: {
      Accept: "application/pdf,application/octet-stream,*/*",
      ...(options?.headers ?? {})
    },
    body: requestBody
  });

  if (!response.ok) {
    const payload = await parseJsonBody(response);
    throw buildClientError(response, payload);
  }

  return response.blob() as Promise<T>;
}

export async function getBlob(path: string, params?: ApiParams): Promise<Blob> {
  const response = await fetch(buildUrl(path, params), {
    method: "GET",
    headers: {
      Accept: "application/pdf,application/octet-stream,*/*"
    }
  });

  if (!response.ok) {
    const payload = await parseJsonBody(response);
    throw buildClientError(response, payload);
  }

  return response.blob();
}
