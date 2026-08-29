# Evidence Report: Sonnet5 ReviewBoost Recommendation

**Report date:** 2026-08-18 KST  
**Production database snapshot:** Neon query completed 2026-08-18 KST; database clock returned `2026-08-17T15:47:59.433Z`  
**Purpose:** Verify the factual basis of the Sonnet5 response about the ReviewBoost 09-04 gate, install growth, funnel events, pending distribution surfaces, and measurement discipline.

## Executive Finding

The recommendation is substantially supported for the **measurement rule**:

- The 09-04 gate is real.
- The decision metric is paid extension conversion, not installs or free usage.
- Price, copy, quota, and segment changes are prohibited during the measurement window.
- Bug repair was explicitly allowed when it fixes a product failure without changing the measured offer.
- Chrome, Whale, Edge, and marketplace surfaces are intended to be counted separately.

The response is not fully evidenced in two places:

1. The cited “07-24 Web Store install baseline 20+” was not found in the current ledger. Current ledger entries instead show approximately 72 cumulative installs and 38 store users by 08-07, plus an older 10-install baseline.
2. A current Chrome Web Store install count could not be independently retrieved from this workspace. No Chrome Web Store export or GA4 service-account/API credential is configured locally.

## Fresh Production Evidence

### Funnel events

Read-only aggregate query against production `funnel_events`:

| Event | Count | Distinct users | First recorded | Last recorded |
| --- | ---: | ---: | --- | --- |
| `extension_limit_hit` | 7 | 1 | 2026-08-07 00:08:35Z | 2026-08-14 00:37:13Z |
| `extension_checkout_started` | 3 | 1 | 2026-08-07 00:08:32Z | 2026-08-07 20:55:50Z |
| `extension_payment_completed` | 0 | 0 | Not present | Not present |

Event metadata shows:

- All 7 `extension_limit_hit` rows have `source = "popup"`.
- The 3 `extension_checkout_started` rows have no `source` metadata.
- The database contains no payment-completed event rows.

The event name in the response should be corrected from generic `checkout_started` to the implementation name `extension_checkout_started`.

### Funnel events by KST day

The UTC timestamps convert to this KST grouping:

| KST date | `extension_limit_hit` | `extension_checkout_started` |
| --- | ---: | ---: |
| 2026-08-07 | 1 | 1 |
| 2026-08-08 | 3 | 2 |
| 2026-08-10 | 2 | 0 |
| 2026-08-12 | 1 | 0 |
| **Total** | **7** | **3** |

### Extension usage

Read-only aggregate query against production `extension_usage`:

- 2 user/day rows
- 2 distinct users
- Date range: 2026-08-08 through 2026-08-09
- Total recorded usage: 78
- Maximum daily count for one user: 48
- 2026-08-08: 48 uses by 1 user
- 2026-08-09: 30 uses by 1 user

This supports the statement that at least one user approached the free daily limit of 50, but it is not an install count and should not be treated as one.

## Ledger and Repository Evidence

### 09-04 gate

The active ReviewBoost track defines:

- Gate: 2026-09-04, based on 2026-08-07 plus 28 days.
- Kill condition: four weeks with zero full-price extension payments.
- Action: downgrade to the free option and return to zero active work.
- Installs: denominator only; the decision is based on payment.

Sources:

- `~/projects/misc/brain/wiki/projects.md:244-257`
- `~/projects/misc/brain/wiki/decision-log.md:28`
- `PAYWALL-PLAN-2026-08-07.md:5-10`

### Measurement protection

The implementation plan explicitly prohibits changing price, copy, or quota during the four-week measurement window. The same plan states that the purpose is to preserve interpretability of the result.

Sources:

- `PAYWALL-PLAN-2026-08-07.md:18-23`
- `~/projects/misc/brain/wiki/projects.md:272,297`

### Bug-fix exception

The 2026-08-08 decision records parser repair during the gate period while keeping price, copy, and segment unchanged. The associated diagnosis says the first customer received unusable output because the CSV parser treated a product-number column as review text.

Sources:

- `~/projects/misc/brain/wiki/decision-log.md:25`
- `~/projects/misc/brain/wiki/projects.md:267-270`
- `~/projects/misc/brain/raw/payments/reviewboost-churn-diagnosis-2026-08-08.md:24-40`

This supports Sonnet5's “bug fixes are allowed” conclusion, although the exact phrase “exception for capitalizing on a traffic bump” is an inference and is not stated verbatim in the ledger.

### Funnel instrumentation

The schema and application define exactly three extension funnel events:

- `extension_limit_hit`
- `extension_checkout_started`
- `extension_payment_completed`

Sources:

- `src/lib/db/schema.ts:61-75`
- `src/lib/db/queries.ts:262-285`
- `src/app/api/extension/event/route.ts:66`
- `src/app/api/extension/usage/route.ts:140`
- `src/app/api/billing/checkout/route.ts:307`
- `src/app/api/billing/webhook/route.ts:163-167`

The repository previously lacked a product query helper for aggregate funnel counts, but the production read-only SQL above confirms the rows directly.

### Separate surface accounting

The ledger says Whale, Edge, 재능넷, and 크몽 are separate surfaces and should not be pooled into the Chrome gate. The Whale and Edge store documents separately define their platform-specific install denominators.

Sources:

- `~/projects/misc/brain/wiki/projects.md:253-257`
- `~/projects/misc/brain/wiki/log.md:195-215`
- `extension/WHALE_STORE.md:72-75`
- `extension/EDGE_STORE.md:103-106`
- `kin-bot/kmong-gig-draft.md:68-69`

These statuses are ledger snapshots from 2026-08-12/13, not a fresh external marketplace status check.

## Install Evidence Check

The Sonnet5 response states that the last recorded baseline was 07-24 with “Web Store installs 20+.” That exact claim was not found in the current repository or the current brain ledger.

The available ledger evidence is:

- 2026-07-22: extension install baseline set to 10 in `decision-log.md:130`.
- 2026-08-07 track state: “누적 약 72건, 스토어 사용자 38” in `projects.md:253`.
- The active track estimated 30-55 new installs over four weeks, but explicitly says the final denominator must be measured at the gate in `projects.md:250-253`.

Therefore:

- “20+ on 07-24” is **not verified** from the current evidence set.
- “Install count now versus 07-24” cannot be calculated from the available local data.
- A Chrome Web Store Developer Dashboard export is required to establish the current install count and date range.

## Assessment of Sonnet5 Response

| Statement | Verdict |
| --- | --- |
| Distinguish installs from limit-hit and checkout events | **Supported** |
| Payment is the actual 09-04 decision metric | **Supported** |
| Do not change price, copy, or quota during the gate | **Supported** |
| Bug fixes may proceed when they preserve the measured offer | **Supported in substance** |
| Check `extension_limit_hit` and checkout counts | **Supported** |
| Use event name `checkout_started` | **Terminology error**; use `extension_checkout_started` |
| Current install baseline is 07-24 at 20+ | **Unsupported by current ledger** |
| Pending surfaces are approval-waiting | **Supported by Aug 12-13 ledger snapshots; not freshly rechecked** |
| More installs alone predict the 09-04 outcome | **Not established**; the data currently shows 7 limit hits, 3 checkout starts, and 0 completed payments, but attribution and user-level conversion cannot be inferred from aggregate counts alone |

## Recommended Next Evidence Collection

1. Export Chrome Web Store Developer Dashboard installs/users for 2026-07-24 through the report date.
2. Record the export filename, timezone, metric definition, and extraction timestamp in the ledger.
3. Keep the production funnel snapshot above as the current baseline: 7 limit hits, 3 checkout starts, 0 completed payments.
4. If attribution is needed across Chrome, Whale, and Edge, add or verify a source tag before interpreting cross-surface payment results. Do not pool those surfaces retroactively.

## Follow-up Check: Did Usage Logging Stop?

### Production result

The apparent stop in `extension_usage` is real:

| Table/event | Latest activity | Identified users | Anonymous rows/events |
| --- | --- | ---: | ---: |
| `extension_usage` | 2026-08-09, 30 uses | 2 user/day rows total | Not applicable; `user_id` is required |
| `extension_limit_hit` | 2026-08-14 | 1 user across all event history | 6 of 7 events |

Detailed KST event breakdown:

| KST date | Event | Total | Identified | Anonymous |
| --- | --- | ---: | ---: | ---: |
| 2026-08-07 | `extension_checkout_started` | 1 | 1 | 0 |
| 2026-08-07 | `extension_limit_hit` | 1 | 1 | 0 |
| 2026-08-08 | `extension_checkout_started` | 2 | 2 | 0 |
| 2026-08-10 | `extension_limit_hit` | 3 | 0 | 3 |
| 2026-08-12 | `extension_limit_hit` | 2 | 0 | 2 |
| 2026-08-14 | `extension_limit_hit` | 1 | 0 | 1 |

The 08-09 usage row belongs to the same identified user who generated one earlier limit-hit event. The later 08-10/12/14 limit-hit events do not belong to either of the two users represented in `extension_usage`.

### What this proves

- The server-side event endpoint was still receiving and recording requests after 08-09. Therefore, the evidence does **not** support a total production database or event-pipe outage.
- The later activity was not attributable to authenticated extension users. It came through the anonymous path.
- The absence of later `extension_usage` rows is therefore consistent with anonymous users using the extension's local fallback quota, not necessarily with failed database writes.
- New installs cannot be inferred from either table. `extension_usage` tracks authenticated quota consumption, while `funnel_events` tracks selected funnel actions and deliberately permits nullable `user_id`.

### Code explanation

The extension only sends server quota consumption after an auth token is available. `recordCollected()` always increments local Chrome storage, but returns without a database request when no token exists.

Sources:

- `extension/src/lib/usage.ts:65-98` — authenticated server read, anonymous/local fallback
- `extension/src/lib/usage.ts:100-120` — local increment first; server POST only when authenticated
- `src/app/api/extension/usage/route.ts:111-137` — quota POST requires a valid extension token
- `src/app/api/extension/usage/route.ts:151-169` — database failure returns 503 and fails closed
- `src/app/api/extension/event/route.ts:34-43,50-68` — limit-hit event accepts anonymous requests
- `src/lib/db/queries.ts:226-247` — `extension_usage` is written only by successful quota consumption
- `src/lib/db/schema.ts:63-71` — `funnel_events.user_id` is nullable

There is one observability weakness: `recordCollected()` does not inspect the HTTP status returned by the server POST (`extension/src/lib/usage.ts:112-120`). A 503 is swallowed just like a network failure. This is a monitoring gap, but the current database evidence does not prove that it caused the 08-09 usage cutoff.

### Diagnosis

**Most supported explanation:** later users reached the anonymous/local usage path or had not connected their accounts. The quota/event system was still active, as shown by post-08-09 `extension_limit_hit` rows.

**Not proven:** that authenticated usage writes are broken for new installs. There are no post-08-09 authenticated usage rows to test this directly.

**Operational implication:** the 09-04 gate is not invalidated by a demonstrated logging outage, but its install-to-usage denominator is incomplete. The current data cannot distinguish “new users did not connect/use the extension” from “new authenticated usage writes failed.” Install totals and authenticated connection cohorts must be joined before treating zero payment as a strong conversion conclusion.

### Minimum next check

1. Obtain the Chrome Web Store install/user export for the same period.
2. Compare it with authenticated extension-token issuance or `/api/extension/usage` GET/POST logs. No durable request-log table currently exists for that route.
3. Add a temporary or permanent counter for `usage_post_success`, `usage_post_503`, `usage_post_401`, and `usage_post_anonymous_attempt` before using the 09-04 result to diagnose conversion.
