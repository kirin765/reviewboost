const LIVE_API_BASE = "https://api.paddle.com";
const SANDBOX_API_BASE = "https://sandbox-api.paddle.com";

type PaddleRequestOpts = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

type PaddleRequestErrorInfo = {
  status: number;
  code: string;
  message: string;
  detail?: string;
  raw?: unknown;
  rawText?: string;
};

function trimEnv(name: string): string {
  return String(process.env[name] ?? "").trim();
}

function requireEnv(name: string, message?: string): string {
  const value = trimEnv(name);
  if (!value) {
    throw new Error(message ?? `${name} is not set`);
  }
  return value;
}

function validateUrl(urlValue: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(urlValue);
  } catch {
    throw new Error(`${name} must be a valid absolute URL`);
  }

  return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/$/, "");
}

function paddleApiKey() {
  return requireEnv("PADDLE_API_KEY", "PADDLE_API_KEY is not set");
}

export function paddleEnv(): "sandbox" | "live" {
  const value = trimEnv("PADDLE_ENV").toLowerCase();
  if (!value) return "sandbox";
  if (value === "sandbox" || value === "live") return value;
  throw new Error("PADDLE_ENV must be either 'sandbox' or 'live'");
}

function paddleApiBase() {
  return paddleEnv() === "live" ? LIVE_API_BASE : SANDBOX_API_BASE;
}

export function isPaddleConfigured() {
  try {
    paddleEnv();
  } catch {
    return false;
  }

  return Boolean(trimEnv("PADDLE_API_KEY") && trimEnv("PADDLE_BASIC_PRICE_ID") && trimEnv("PADDLE_PRO_PRICE_ID"));
}

export function paddlePriceIdForPlan(plan: "basic" | "pro") {
  const name = plan === "pro" ? "PADDLE_PRO_PRICE_ID" : "PADDLE_BASIC_PRICE_ID";
  const priceId = requireEnv(name, `${name} is not set for plan '${plan}'`);
  if (!priceId.startsWith("pri_")) {
    throw new Error(`${name} must be a Paddle price id (usually starts with 'pri_')`);
  }
  return priceId;
}

export function paddlePlanForPriceId(priceId: string | null | undefined): "free" | "basic" | "pro" {
  const normalizedPriceId = String(priceId ?? "").trim();
  if (!normalizedPriceId) return "free";

  const basic = trimEnv("PADDLE_BASIC_PRICE_ID");
  const pro = trimEnv("PADDLE_PRO_PRICE_ID");
  if (pro && normalizedPriceId === pro) return "pro";
  if (basic && normalizedPriceId === basic) return "basic";
  return "free";
}

export async function paddleRequest(path: string, opts?: PaddleRequestOpts): Promise<any> {
  if (!path || !path.startsWith("/")) {
    throw new Error("Paddle request path must start with '/'");
  }

  const method = opts?.method ?? "POST";
  const res = await fetch(`${paddleApiBase()}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${paddleApiKey()}`,
      "content-type": "application/json",
      "paddle-version": "1"
    },
    body: method === "GET" ? undefined : JSON.stringify(opts?.body ?? {}),
    cache: "no-store"
  });

  const text = await res.text();
  let json: any = null;
  let parsed = false;
  try {
    json = text ? JSON.parse(text) : null;
    parsed = true;
  } catch {
    // ignore invalid json; use fallback error
  }

  if (!res.ok) {
    const nestedError = json && typeof json === "object" ? json.error : undefined;
    const nestedDetail =
      nestedError && typeof nestedError === "object" ? nestedError.detail : undefined;
    const nestedMessage =
      nestedError && typeof nestedError === "object" ? nestedError.message : undefined;
    const topErrorMessage = typeof json?.message === "string" ? json.message : undefined;
    const topError = typeof json?.error === "string" ? json.error : undefined;

    const detail =
      typeof nestedDetail === "string"
        ? nestedDetail
        : typeof nestedMessage === "string"
          ? nestedMessage
          : typeof topErrorMessage === "string"
            ? topErrorMessage
            : typeof topError === "string"
              ? topError
              : undefined;

    const code = String(
      nestedError && typeof nestedError === "object" && typeof nestedError.code === "string"
        ? nestedError.code
        : "paddle_request_failed"
    );

    const message = String(
      detail ?? `Paddle request failed (${res.status})`
    );

    const info: PaddleRequestErrorInfo = {
      status: res.status,
      code,
      message,
      detail: typeof detail === "string" ? detail : undefined,
      raw: parsed ? json : text,
      rawText: parsed ? undefined : text
    };

    const error = new Error(message) as Error & { info: PaddleRequestErrorInfo };
    error.info = info;
    throw error;
  }

  return json?.data ?? json;
}

export function appBaseUrl(req: Request): string {
  const fromEnv = trimEnv("APP_BASE_URL");
  if (fromEnv) {
    return validateUrl(fromEnv, "APP_BASE_URL");
  }

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
