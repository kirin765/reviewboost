import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

export type ApiLogInput = {
  route: string;
  method: string;
  status: number;
  code?: string;
  message: string;
  details?: string;
  request?: Request;
  error?: unknown;
  extra?: Record<string, unknown>;
};

const DEFAULT_API_ERROR_LOG_PATH = "logs/api-error.log";

function getApiErrorLogPath(): string {
  const configured = String(process.env.API_ERROR_LOG_PATH ?? "").trim();
  const rawPath = configured || DEFAULT_API_ERROR_LOG_PATH;
  return path.isAbsolute(rawPath) ? rawPath : path.join(process.cwd(), rawPath);
}

function normalizeRequestContext(req?: Request) {
  if (!req) {
    return {
      route: undefined,
      method: undefined,
      ip: undefined,
      userAgent: undefined
    };
  }

  const headers = req.headers;
  return {
    route: (() => {
      try {
        return new URL(req.url).pathname;
      } catch {
        return undefined;
      }
    })(),
    method: req.method,
    ip:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      headers.get("cf-connecting-ip") ??
      undefined,
    userAgent: headers.get("user-agent") ?? undefined
  };
}

function serializeError(error?: unknown): string {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}${error.stack ? ` | stack=${error.stack}` : ""}`;
  }
  if (typeof error === "string") return error;
  if (error == null) return "";
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export async function logApiError(input: ApiLogInput): Promise<void> {
  if (process.env.DISABLE_API_ERROR_LOG === "1") return;

  try {
    const reqCtx = normalizeRequestContext(input.request);
    const payload = {
      ts: new Date().toISOString(),
      route: input.route || reqCtx.route || "unknown",
      method: input.method || reqCtx.method || "unknown",
      status: input.status,
      code: input.code ?? "unknown",
      message: input.message,
      details: input.details,
      ip: reqCtx.ip,
      userAgent: reqCtx.userAgent,
      error: serializeError(input.error),
      ...(input.extra && input.extra),
      env: process.env.NODE_ENV ?? "development"
    };

    const logPath = getApiErrorLogPath();
    await mkdir(path.dirname(logPath), { recursive: true });
    await appendFile(logPath, `${JSON.stringify(payload)}\n`, "utf8");
  } catch {
    // log persistence is best-effort only
  }
}
