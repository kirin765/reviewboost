# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ReviewBoost is a Korean-language SaaS tool for e-commerce review analysis. Sellers upload CSV review data, get sentiment/category classification, negative keyword extraction, improvement suggestions, and downloadable PDF reports. All UI text is in Korean.

## Commands

```bash
npm run dev          # Dev server on port 3001
npm run build        # Production build
npm run start        # Production server on port 3000
npm run lint         # ESLint (next/core-web-vitals)
```

```bash
npm run typecheck      # next typegen + tsc --noEmit
npm test               # source-text guards + full Vitest suite (vitest run)
npx vitest run         # Vitest unit/component tests directly
npm run test:e2e:smoke # Playwright E2E (starts its own dev server on 3001)
```

Tests use **Vitest** (unit + jsdom component/route tests under `src/**/*.test.ts(x)` and `tests/**`) and **Playwright** (`tests/e2e.spec.ts`). `npm test` runs the two legacy source-text guard scripts and then `vitest run`.

### CI / gating (no GitHub Actions)

GitHub Actions is **disabled** on this repo, so `.github/workflows/ci.yml` does not run — the **Vercel** build (`next build` on every push/PR) and **local** checks are the gates. Before pushing, run `npm run typecheck && npx vitest run` (and `npm run test:e2e:smoke` for UI changes). An opt-in local pre-push hook is provided at `.githooks/pre-push` (runs typecheck + vitest); enable it per-clone with `git config core.hooksPath .githooks`.

### E2E (Playwright)

`playwright.config.ts` loads `.env.local`, forces `NODE_ENV=development` (the file pins `production`, which would make the dev Edge middleware disallow `eval`), and starts `DEV_FORCE_ANALYSIS_MODE=heuristic npm run dev`. Authenticated dashboard tests sign in as a dedicated Clerk **test user** via `@clerk/testing` (backend ticket sign-in — no password needed at runtime). One-time setup: create the test user with `node scripts/e2e/create-clerk-test-user.mjs` (needs a `sk_test_` `CLERK_SECRET_KEY`; writes `E2E_CLERK_USER_EMAIL`/`E2E_CLERK_USER_PASSWORD` to gitignored `.env.local`). Authenticated tests `test.skip` when `E2E_CLERK_USER_EMAIL` is absent. `tests/global.setup.ts` fetches the Clerk testing token and warms route compilation.

## Tech Stack

- **Next.js 15** with App Router, React 18, TypeScript 5 (strict mode)
- **Clerk** for authentication (optional — auth-gated features degrade gracefully without `CLERK_SECRET_KEY`)
- **Neon Postgres** via **Drizzle ORM** for storage (`DATABASE_URL`; optional — app runs without persistence)
- **OpenAI API** (gpt-4o-mini) for LLM classification and suggestions (optional — falls back to heuristic/template)
- **Paddle** for subscription billing (optional)
- **Puppeteer** for HTML-to-PDF, **PDFKit** as fallback
- A companion **Chrome extension** ("ReviewBoost 리뷰 수집기") exports Coupang/SmartStore reviews, linked from the top nav and homepage
- Path alias: `@/*` maps to `src/*`

## Architecture

### Analysis Pipeline (core data flow)

1. **Upload & Preview** (`POST /api/preview`): accepts `.csv` and `.xlsx` (Smartstore exports xlsx only), validates mime/encoding/size ≤6MB — for xlsx the limit is re-checked after expansion — infers delimiter, returns sample rows for column mapping
2. **Column Mapping** (client-side): user maps columns to review text, rating, date
3. **Analysis** (`POST /api/analyze`): the central endpoint
   - Always runs **heuristic classification** first (rating-based sentiment, keyword-based category into 6 buckets: 배송/품질/가격/사용성/CS/기타)
   - Optionally runs **LLM classification** (batched OpenAI calls with configurable timeout/batch size; samples max 180 reviews from large datasets, prioritizing negative→neutral→positive then recency)
   - Generates **suggestions** via LLM or template fallback (detail page copy, CS response templates, FAQs)
   - Computes stats: sentiment distribution, avg rating, negative keyword TOP 10, category counts, priority score (0-100), recency analysis
   - **Quota + storage**: for authenticated users, `/api/analyze` atomically **reserves** an `analyses` row *before* the pipeline (a single conditional insert enforcing the monthly limit, so concurrent bursts can't bypass it or run paid LLM work), then **finalizes** that row with results. On failure the slot is released. Reservation fails closed on DB errors. Reserved-but-unfinalized rows (placeholder `stats = '{}'`) are hidden from history.
4. **PDF Export** (`POST /api/report`, `GET /api/report/[id]`): renders HTML template via Puppeteer, falls back to PDFKit. Korean font (Noto Sans KR) needed for PDFKit fallback.

### Key Directories

- `src/app/(auth)/` — login, signup via Clerk catch-all routes (`login/[[...rest]]`, `signup/[[...rest]]`)
- `src/app/api/` — all API route handlers (analyze, preview, report, billing, capabilities, health)
- `src/app/dashboard/` — main analysis UI, history, analysis detail (auth-protected via `middleware.ts`)
- `src/lib/` — core business logic, all pure-function utilities
- `src/lib/db/` — Drizzle setup: `schema.ts` (tables), `queries.ts` (all user-scoped queries), `index.ts` (neon-http client)

### Important Library Files

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Core types: `ReviewRow`, `Sentiment`, `Category`, `ClassifiedReview`, `AnalysisStats`, `Suggestions`, `AnalysisOutput` |
| `src/lib/analysis.ts` | Heuristic sentiment/category classification, stats computation, priority scoring |
| `src/lib/openai_classify.ts` | Batched LLM classification with timeout and sampling |
| `src/lib/openai_suggestions.ts` | LLM suggestion generation with template fallback |
| `src/lib/csv.ts` | CSV parsing, delimiter inference, header detection, column mapping, unusable-text-column detection |
| `src/lib/xlsx-import.ts` | xlsx → CSV conversion for uploads (fflate unzip + sheet XML parse, read-only) |
| `src/lib/keywords.ts` | Korean negative keyword extraction (stopwords, particles, bigrams) |
| `src/lib/plan.ts` | Plan tier resolution (free/basic/pro) and monthly limit enforcement |
| `src/lib/billing.ts` | Paddle subscription tracking via Neon/Drizzle (`subscriptions` table) |
| `src/lib/paddleWebhook.ts` | Paddle webhook signature verification (HMAC + timestamp freshness / replay protection) |
| `src/lib/dev_flags.ts` | Dev-only env overrides (`DEV_ALLOW_ADVANCED_AI`, `DEV_FORCE_ANALYSIS_MODE`) |
| `src/lib/api_error.ts` | Custom `ApiError` class with code, status, help text |

### Graceful Degradation Pattern

Every external dependency is optional. The app works without OpenAI (template suggestions), without Clerk (no auth), without `DATABASE_URL` (no storage/history/quota metering), without Puppeteer (PDFKit fallback), and without Korean fonts (degraded PDF).

### Subscription & Plan Tiers

Resolution order: env-based email overrides → Paddle subscription status (Neon `subscriptions` table) → default Free. Plans: Free (5 analyses/month), Basic (200), Pro (1000) — source of truth in `src/lib/plan_gates.ts`. Monthly limits enforced in `/api/analyze` via slot reservation (see Analysis Pipeline above).

### Database

Neon Postgres via Drizzle (`src/lib/db/schema.ts`): `analyses`, `reviews`, `profiles`, `subscriptions`. There is no Postgres RLS — access is scoped in the app layer: every query in `src/lib/db/queries.ts` goes through `requireUserId` and filters by `user_id`. Exception: `funnel_events` is an append-only counter table exempt from user scoping (nullable `user_id`, best-effort inserts, no reads in product paths). The neon-http driver has no interactive transactions, so cross-statement atomicity (e.g. quota) is expressed as single conditional statements.

## Environment Variables

See `.env.example` for full list. Key groups:
- **OpenAI**: `OPENAI_API_KEY`, `OPENAI_MODEL`, timeout/batch config
- **Clerk (auth)**: `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`/`SIGN_UP_URL`/`AFTER_*`
- **Database**: `DATABASE_URL` (Neon Postgres connection string)
- **Paddle**: `APP_BASE_URL`, `PADDLE_ENV`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_WEBHOOK_TOLERANCE_SECONDS` (replay window, default 300), price IDs, `NEXT_PUBLIC_PADDLE_TOKEN*`
- **Plan overrides**: `PLAN_PRO_EMAILS`, `PLAN_BASIC_EMAILS` (comma-separated)
- **Dev flags** (never set in production): `DEV_ALLOW_ADVANCED_AI=1`, `DEV_FORCE_ANALYSIS_MODE=auto|heuristic|llm`

## Conventions

- Korean language throughout UI, error messages, category names, and keyword analysis
- `"use client"` / `"use server"` directives for component/action boundaries
- Custom `ApiError` class for all API error responses (includes help text arrays)
- CSV validation uses manual checks (delimiter inference, encoding detection); Zod available but not heavily used
- `next.config.js` keeps `pdfkit` in `serverComponentsExternalPackages` and traces its AFM/font assets
- `middleware.ts` is `clerkMiddleware`: it protects `/dashboard` + `/api/{analyze,report,capabilities,billing/checkout}` (only when `CLERK_SECRET_KEY` is set) and rewrites `/help-checklist` → `/help/csv-checklist`
