const LIVE_API_BASE = "https://api.paddle.com";
const SANDBOX_API_BASE = "https://sandbox-api.paddle.com";

type PaddleRequestOpts = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
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
<<<<<<< HEAD
  const apiKey = String(process.env.PADDLE_API_KEY ?? "").trim();
  const basic = String(process.env.PADDLE_BASIC_PRICE_ID ?? "").trim();
  const pro = String(process.env.PADDLE_PRO_PRICE_ID ?? "").trim();
  return Boolean(apiKey && basic && pro);
=======
  try {
    paddleEnv();
  } catch {
    return false;
  }

  return Boolean(trimEnv("PADDLE_API_KEY") && trimEnv("PADDLE_BASIC_PRICE_ID") && trimEnv("PADDLE_PRO_PRICE_ID"));
>>>>>>> 1dcf99940a0ffb7ec8aecdb9ca23158232723b32
}

export function paddlePriceIdForPlan(plan: "basic" | "pro") {
  const name = plan === "pro" ? "PADDLE_PRO_PRICE_ID" : "PADDLE_BASIC_PRICE_ID";
  return requireEnv(name, `${name} is not set for plan '${plan}'`);
}

export function paddlePlanForPriceId(priceId: string | null | undefined): "free" | "basic" | "pro" {
<<<<<<< HEAD
  const target = String(priceId ?? "").trim();
  const basic = String(process.env.PADDLE_BASIC_PRICE_ID ?? "").trim();
  const pro = String(process.env.PADDLE_PRO_PRICE_ID ?? "").trim();
  if (target && pro && target === pro) return "pro";
  if (target && basic && target === basic) return "basic";
=======
  const normalizedPriceId = String(priceId ?? "").trim();
  if (!normalizedPriceId) return "free";

  const basic = trimEnv("PADDLE_BASIC_PRICE_ID");
  const pro = trimEnv("PADDLE_PRO_PRICE_ID");
  if (pro && normalizedPriceId === pro) return "pro";
  if (basic && normalizedPriceId === basic) return "basic";
>>>>>>> 1dcf99940a0ffb7ec8aecdb9ca23158232723b32
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
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // ignore invalid json; use fallback error
  }

  if (!res.ok) {
    const msg = json?.error?.detail || json?.error?.message || `Paddle request failed (${res.status})`;
    throw new Error(String(msg));
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
