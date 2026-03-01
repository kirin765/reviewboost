declare namespace NodeJS {
  interface ProcessEnv {
    APP_ENV?: "local" | "staging" | "production";
    APP_BASE_URL?: string;
    NODE_ENV?: "development" | "production" | "test";

    NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
    NEXT_PUBLIC_PADDLE_TOKEN?: string;
    NEXT_PUBLIC_PADDLE_TOKEN_LIVE?: string;
    NEXT_PUBLIC_PADDLE_TOKEN_SANDBOX?: string;
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;

    SUPABASE_URL?: string;
    SUPABASE_ANON_KEY?: string;
    SUPABASE_SERVICE_ROLE_KEY?: string;

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

    NEXT_PUBLIC_SUPABASE_ACCESS_TOKEN?: string;
    REPORT_FONT_PATH?: string;
    REPORT_ENABLE_PDFKIT_FALLBACK?: string;
    SECURITY_ALLOWLIST_CVES?: string;
    PERF_SMOKE_MAX_MS?: string;
    PERF_SMOKE_BASELINE_MS?: string;
    PERF_SMOKE_SPIKE_RATIO?: string;
  }
}
