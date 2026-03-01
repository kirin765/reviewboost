export type EnvMode = "local" | "staging" | "production";

function clean(value: string | undefined): string {
  return String(value ?? "").trim();
}

function getMode(raw: string | undefined): EnvMode {
  const v = clean(raw).toLowerCase();
  if (v === "local" || v === "staging" || v === "production") return v;
  return "production";
}

export const appEnv = getMode(clean(process.env.APP_ENV) || clean(process.env.NODE_ENV));

export function appBaseUrl(): string {
  const raw = clean(process.env.APP_BASE_URL);
  if (raw) return raw;

  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  return "http://localhost:3000";
}

export function nextPublic(value: string | undefined): string | undefined {
  const v = clean(value);
  return v || undefined;
}

export function isProductionEnv() {
  return appEnv === "production" || process.env.NODE_ENV === "production";
}

export const env = {
  app: {
    env: appEnv,
    isProduction: isProductionEnv()
  },
  paddle: {
    publicSandboxToken: nextPublic(process.env.NEXT_PUBLIC_PADDLE_TOKEN_SANDBOX),
    publicLiveToken: nextPublic(process.env.NEXT_PUBLIC_PADDLE_TOKEN_LIVE),
    publicLegacyToken: nextPublic(process.env.NEXT_PUBLIC_PADDLE_TOKEN),
    browserToken: () => {
      if (isProductionEnv() && env.paddle.publicLiveToken) return env.paddle.publicLiveToken;
      if (!isProductionEnv() && env.paddle.publicSandboxToken) return env.paddle.publicSandboxToken;
      return env.paddle.publicLegacyToken;
    },
    webhookSecret: clean(process.env.PADDLE_WEBHOOK_SECRET),
    basicPriceId: clean(process.env.PADDLE_BASIC_PRICE_ID),
    proPriceId: clean(process.env.PADDLE_PRO_PRICE_ID)
  },
  supabase: {
    publicUrl: nextPublic(process.env.NEXT_PUBLIC_SUPABASE_URL) ?? nextPublic(process.env.SUPABASE_URL),
    publicAnonKey: nextPublic(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) ?? nextPublic(process.env.SUPABASE_ANON_KEY)
  },
  openai: {
    model: nextPublic(process.env.OPENAI_MODEL) || "gpt-4o-mini",
    classifyBatchSize: Number(nextPublic(process.env.OPENAI_CLASSIFY_BATCH_SIZE) ?? "60"),
    classifyMaxConcurrency: Number(nextPublic(process.env.OPENAI_CLASSIFY_MAX_CONCURRENCY) ?? "2"),
    classifyTimeoutMs: Number(nextPublic(process.env.OPENAI_CLASSIFY_TIMEOUT_MS) ?? "12000"),
    suggestTimeoutMs: Number(nextPublic(process.env.OPENAI_SUGGEST_TIMEOUT_MS) ?? "12000")
  },
  report: {
    fontPath: nextPublic(process.env.REPORT_FONT_PATH)
  },
  analysis: {
    maxLlmReviews: asNumberEnv(process.env.MAX_LLM_REVIEWS, 180),
    maxLlmReviewsFree: asNumberEnv(process.env.MAX_LLM_REVIEWS_FREE, 60)
  }
};

export function asNumberEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(clean(value));
  return Number.isFinite(parsed) ? parsed : fallback;
}
