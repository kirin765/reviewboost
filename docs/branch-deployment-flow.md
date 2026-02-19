# Branch-to-Environment Deployment Guide

## Branch mapping

- `main` → **production** deployment
- `staging` → **staging** deployment
- `feature/*` (PRs) → **preview** deployment (ephemeral)

## Standard development flow

1. Create feature branch from `staging`.
2. Open PR into `staging`.
3. Run preview deployment + CI checks.
4. Merge to `staging` after approval.
5. Staging auto-deploys.
6. Run staging smoke tests.
7. Promote to production by PR: `staging` → `main`.
8. After approval and green checks, merge PR.
9. Production deploy runs and post-deploy smoke tests execute.

## PR preview workflow

For each PR:

- Build app with PR commit
- Use isolated preview URL
- Inject safe preview/staging secrets only (never production secrets)
- Run minimum checks:
  - lint
  - typecheck
  - unit tests
  - build
  - `/api/health` response

## Promotion process (staging → production)

1. Confirm staging is stable for agreed soak period (ex: 24h).
2. Create PR from `staging` to `main`.
3. Validate release checklist:
   - migration compatibility
   - env var parity (names, not values)
   - webhook endpoint readiness
4. Require at least one maintainer approval.
5. Merge during deployment window.
6. Run production smoke checklist.
7. Announce release + rollback commit hash.

## Hotfix flow

- Branch from `main`: `hotfix/<issue>`
- PR into `main` with required checks
- After merge, back-merge `main` into `staging` to keep parity
