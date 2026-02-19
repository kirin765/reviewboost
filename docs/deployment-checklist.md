# ReviewBoost Deployment Checklist (Staging / Production)

This checklist is for maintainers to operate **separated staging and production environments** safely.

## 1) One-time environment separation setup

- [ ] Create two app runtimes:
  - [ ] `reviewboost-staging`
  - [ ] `reviewboost-prod`
- [ ] Create two domains:
  - [ ] `staging.<your-domain>` for staging
  - [ ] `<your-domain>` for production
- [ ] Configure TLS certificates for each domain.
- [ ] Configure independent secrets per environment (never shared).

## 2) Database and auth separation

- [ ] Create separate Supabase projects (or separate isolated stacks):
  - [ ] staging DB/Auth project
  - [ ] production DB/Auth project
- [ ] Apply schema/migrations to staging first (`supabase/schema.sql` + migrations policy).
- [ ] Verify staging app points to staging Supabase keys.
- [ ] Verify production app points to production Supabase keys.
- [ ] Confirm no cross-environment credentials are reused.

Validation commands:

```bash
# From each deployed environment shell/log context
echo "$APP_ENV $APP_BASE_URL"
# Inspect masked secret names in deployment platform
```

## 3) Payment and webhook separation

- [ ] Use Paddle `sandbox` for staging and `live` for production.
- [ ] Set distinct webhook secrets:
  - [ ] `PADDLE_WEBHOOK_SECRET` (staging)
  - [ ] `PADDLE_WEBHOOK_SECRET` (prod)
- [ ] Register two webhook endpoints in Paddle:
  - [ ] `https://staging.<your-domain>/api/billing/webhook`
  - [ ] `https://<your-domain>/api/billing/webhook`
- [ ] Confirm staging price IDs are not used in production.

## 4) Domain, callback, and auth URL checks

- [ ] `APP_BASE_URL` matches actual runtime URL in each environment.
- [ ] Auth redirect/callback URLs configured for both domains.
- [ ] No prod callback URL appears in staging env vars (and vice versa).

## 5) Monitoring and logging separation

- [ ] Separate dashboards/alerts for staging and production.
- [ ] Include `APP_ENV` label in log/trace metadata.
- [ ] Alert routing:
  - [ ] staging alerts → dev channel
  - [ ] production alerts → on-call/incident channel

## 6) Healthcheck verification

ReviewBoost provides:

- `GET /api/health` → `200` with JSON `{ status: "ok", service, timestamp }`

Checks:

```bash
curl -sS https://staging.<your-domain>/api/health | jq .
curl -sS https://<your-domain>/api/health | jq .
```

Expected: HTTP 200 and `status: "ok"`.

## 7) Post-deploy smoke tests (every release)

- [ ] Open landing page `/`
- [ ] Sign in/sign up flow works (`/login`, `/signup`)
- [ ] Upload sample CSV and run analysis
- [ ] Report generation endpoint works (`/api/report`)
- [ ] Pricing page loads (`/pricing`)
- [ ] Billing checkout request returns expected response in target env
- [ ] Webhook endpoint returns expected status for signed test event
- [ ] Dashboard/history route access works (`/dashboard`, `/dashboard/history`)

## 8) Rollback basics

When a deploy fails in staging/prod:

1. Pause further deployments.
2. Roll back to the last known-good artifact/commit.
3. Re-verify healthcheck + smoke tests.
4. If DB migration caused issue:
   - apply tested rollback migration (or restore from backup)
   - verify schema compatibility with rolled-back app version.
5. Post incident note in `/docs` (impact, root cause, prevention).

## 9) Incident response minimum

- [ ] Define severity levels (SEV1/SEV2/SEV3)
- [ ] Record owner/on-call contact
- [ ] Communicate status every 30 minutes for SEV1
- [ ] Keep timeline: detect → mitigate → recover → review
- [ ] Capture action items with owner and due date
