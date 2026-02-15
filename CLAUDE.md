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

There is no test suite. CI (`.github/workflows/ci.yml`) runs: `npm ci` → `lint` → `build`.

## Tech Stack

- **Next.js 14** with App Router, React 18, TypeScript 5 (strict mode)
- **Supabase** for auth, database, and RLS policies (optional — app degrades gracefully without it)
- **OpenAI API** (gpt-4o-mini) for LLM classification and suggestions (optional — falls back to heuristic/template)
- **Paddle** for subscription billing (optional)
- **Puppeteer** for HTML-to-PDF, **PDFKit** as fallback
- Path alias: `@/*` maps to `src/*`

## Architecture

### Analysis Pipeline (core data flow)

1. **Upload & Preview** (`POST /api/preview`): validates CSV (mime, encoding, size ≤6MB), infers delimiter, returns sample rows for column mapping
2. **Column Mapping** (client-side): user maps columns to review text, rating, date
3. **Analysis** (`POST /api/analyze`): the central endpoint
   - Always runs **heuristic classification** first (rating-based sentiment, keyword-based category into 6 buckets: 배송/품질/가격/사용성/CS/기타)
   - Optionally runs **LLM classification** (batched OpenAI calls with configurable timeout/batch size; samples max 180 reviews from large datasets, prioritizing negative→neutral→positive then recency)
   - Generates **suggestions** via LLM or template fallback (detail page copy, CS response templates, FAQs)
   - Computes stats: sentiment distribution, avg rating, negative keyword TOP 10, category counts, priority score (0-100), recency analysis
4. **Storage** (`POST /api/report`): saves to Supabase `analyses` + `reviews` tables if configured
5. **PDF Export**: renders HTML template via Puppeteer, falls back to PDFKit. Korean font (Noto Sans KR) needed for PDFKit fallback.

### Key Directories

- `src/app/(auth)/` — login, signup, forgot-password (server actions in `actions.ts`)
- `src/app/api/` — all API route handlers (analyze, preview, report, billing, capabilities, auth)
- `src/app/dashboard/` — main analysis UI, history, analysis detail (auth-protected via layout)
- `src/lib/` — core business logic, all pure-function utilities
- `supabase/schema.sql` — table definitions and RLS policies

### Important Library Files

| File | Purpose |
|------|---------|
| `src/lib/types.ts` | Core types: `ReviewRow`, `Sentiment`, `Category`, `ClassifiedReview`, `AnalysisStats`, `Suggestions`, `AnalysisOutput` |
| `src/lib/analysis.ts` | Heuristic sentiment/category classification, stats computation, priority scoring |
| `src/lib/openai_classify.ts` | Batched LLM classification with timeout and sampling |
| `src/lib/openai_suggestions.ts` | LLM suggestion generation with template fallback |
| `src/lib/csv.ts` | CSV parsing, delimiter inference, header detection, column mapping |
| `src/lib/keywords.ts` | Korean negative keyword extraction (stopwords, particles, bigrams) |
| `src/lib/plan.ts` | Plan tier resolution (free/basic/pro) and monthly limit enforcement |
| `src/lib/billing.ts` | Paddle subscription tracking via Supabase |
| `src/lib/dev_flags.ts` | Dev-only env overrides (`DEV_ALLOW_ADVANCED_AI`, `DEV_FORCE_ANALYSIS_MODE`) |
| `src/lib/api_error.ts` | Custom `ApiError` class with code, status, help text |

### Graceful Degradation Pattern

Every external dependency is optional. The app works without OpenAI (template suggestions), without Supabase (no auth/storage), without Puppeteer (PDFKit fallback), and without Korean fonts (degraded PDF).

### Subscription & Plan Tiers

Resolution order: env-based email overrides → Paddle subscription status in Supabase → default Free. Plans: Free (100 analyses/month), Basic (500), Pro (1500). Monthly limits enforced in `/api/analyze`.

### Database

Supabase tables (`supabase/schema.sql`): `analyses`, `reviews`, `profiles`, `subscriptions`. All protected by RLS (users access only their own data). `SUPABASE_SERVICE_ROLE_KEY` is server-only.

## Environment Variables

See `.env.example` for full list. Key groups:
- **OpenAI**: `OPENAI_API_KEY`, `OPENAI_MODEL`, timeout/batch config
- **Supabase**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- **Paddle**: `APP_BASE_URL`, `PADDLE_ENV`, `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, price IDs
- **Dev flags** (never set in production): `DEV_ALLOW_ADVANCED_AI=1`, `DEV_FORCE_ANALYSIS_MODE=auto|heuristic|llm`

## Conventions

- Korean language throughout UI, error messages, category names, and keyword analysis
- `"use client"` / `"use server"` directives for component/action boundaries
- Custom `ApiError` class for all API error responses (includes help text arrays)
- CSV validation uses manual checks (delimiter inference, encoding detection); Zod available but not heavily used
- `next.config.js` keeps `pdfkit` in `serverComponentsExternalPackages` and traces its AFM/font assets
- `middleware.ts` refreshes Supabase auth cookies and rewrites `/help` → `/help-checklist`
