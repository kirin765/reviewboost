const LIVE_API_BASE = "https://api.paddle.com";
const SANDBOX_API_BASE = "https://sandbox-api.paddle.com";

type PaddleRequestOpts = {
  method?: "GET" | "POST";
  body?: Record<string, unknown>;
};

function paddleApiKey() {
  const key = process.env.PADDLE_API_KEY;
  if (!key) throw new Error("PADDLE_API_KEY is not set");
  return key;
}

export function paddleEnv(): "sandbox" | "live" {
  return String(process.env.PADDLE_ENV ?? "sandbox").toLowerCase() === "live" ? "live" : "sandbox";
}

function paddleApiBase() {
  return paddleEnv() === "live" ? LIVE_API_BASE : SANDBOX_API_BASE;
}

export function isPaddleConfigured() {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_BASIC_PRICE_ID && process.env.PADDLE_PRO_PRICE_ID);
}

export function paddlePriceIdForPlan(plan: "basic" | "pro") {
  const id = plan === "pro" ? process.env.PADDLE_PRO_PRICE_ID : process.env.PADDLE_BASIC_PRICE_ID;
  return String(id ?? "").trim() || null;
}

export function paddlePlanForPriceId(priceId: string | null | undefined): "free" | "basic" | "pro" {
  const basic = String(process.env.PADDLE_BASIC_PRICE_ID ?? "").trim();
  const pro = String(process.env.PADDLE_PRO_PRICE_ID ?? "").trim();
  if (priceId && pro && priceId === pro) return "pro";
  if (priceId && basic && priceId === basic) return "basic";
  return "free";
}

export async function paddleRequest(path: string, opts?: PaddleRequestOpts): Promise<any> {
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
    // ignore
  }

  if (!res.ok) {
    const msg = json?.error?.detail || json?.error?.message || `Paddle request failed (${res.status})`;
    throw new Error(String(msg));
  }

  return json?.data ?? json;
}

export function appBaseUrl(req: Request): string {
  const fromEnv = String(process.env.APP_BASE_URL ?? "").trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}
