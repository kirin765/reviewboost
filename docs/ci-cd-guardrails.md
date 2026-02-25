# CI/CD Guardrails for ReviewBoost

This document defines minimum guardrails for safe staging/prod separation.

## Required checks before merge

For PRs targeting `staging` or `main`, require:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

Recommended repository settings:

- Require branch protection for `staging` and `main`
- Require status checks to pass before merge
- Disallow direct pushes to `main`
- Require at least 1 reviewer approval for `main`

## Preview checks

For feature PR previews:

- Build succeeds
- Preview URL returns 200 on `/api/health`
- No production secrets in preview environment
- Optional E2E smoke (if available)

Vercel Git Integration notes:
- PRs to `staging` or `main` automatically get Preview deployments.
- `main` PR merges are production-gated.
- `staging` changes should only use staging/sandbox secrets.

## Production gate recommendations

Before merging `staging` into `main`:

- Staging deploy green and smoke-tested
- Migration rollback path verified
- Webhook signature test passed
- On-call awareness confirmed (during release window)

After production deployment:

- Verify `/api/health`
- Verify login + core analysis + billing entry point
- Monitor error rate and latency for first 15-30 min

## Baseline current CI status in repo

Current GitHub Actions pipeline (`.github/workflows/ci.yml`) already runs:

- install (`npm ci`)
- lint (`npm run lint`)
- build (`npm run build`)

This repository now extends CI to include:

- typecheck (`npm run typecheck`)
- test (`npm run test`)

so merges are blocked by both correctness and build viability.
