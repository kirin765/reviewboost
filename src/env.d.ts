declare namespace NodeJS {
  interface ProcessEnv {
    APP_ENV?: "local" | "staging" | "production";
    APP_BASE_URL?: string;
    NODE_ENV?: "development" | "production" | "test";

    GOOGLE_SITE_VERIFICATION?: string;
    NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
    NEXT_PUBLIC_PADDLE_TOKEN?: string;
    NEXT_PUBLIC_PADDLE_TOKEN_LIVE?: string;
    NEXT_PUBLIC_PADDLE_TOKEN_SANDBOX?: string;

    OPENAI_API_KEY?: string;
    OPENAI_MODEL?: string;
    OPENAI_CLASSIFY_BATCH_SIZE?: string;
    OPENAI_CLASSIFY_MAX_CONCURRENCY?: string;
    OPENAI_CLASSIFY_TIMEOUT_MS?: string;
    OPENAI_SUGGEST_TIMEOUT_MS?: string;
    MAX_LLM_REVIEWS?: string;
    MAX_LLM_REVIEWS_FREE?: string;

    PADDLE_WEBHOOK_SECRET?: string;
    PADDLE_BASIC_PRICE_ID?: string;
    PADDLE_PRO_PRICE_ID?: string;

    REPORT_FONT_PATH?: string;
    REPORT_ENABLE_PDFKIT_FALLBACK?: string;
    SECURITY_ALLOWLIST_CVES?: string;
    PERF_SMOKE_MAX_MS?: string;
    PERF_SMOKE_BASELINE_MS?: string;
    PERF_SMOKE_SPIKE_RATIO?: string;
  }
}
