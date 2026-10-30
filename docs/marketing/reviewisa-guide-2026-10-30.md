# Reviewisa migration guide update — 2026-10-30

Scope: improve the existing `/blog/cafe24-review-migration-checklist` for merchants moving their own Smart Store purchase-review Excel files into Cafe24. Keep the existing URL and video.

- Rewrote the headline, summary/metadata and opening answer around the migration task.
- Added preparation requirements and four numbered steps with three screenshots from the existing October 16 synthetic local demo. Every screenshot is captioned as an example; the completion image is explicitly not proof of an actual Cafe24 registration. Customer data and production registration were not used.
- Removed old widget-specific guidance and retained native-board/product-page checks, preservation after deletion, and free/paid conditions. Public App Store conditions were checked on October 30; the 365-day label does not promise unlimited free transfers.
- Added identical App Store actions after the steps and at the end. Their `reviewisa_store_click` GA4 event uses only the fixed `placement` values `guide_steps` and `guide_end`. It records a click, not an install, registration or payment. QA blocks analytics transmission and inspects calls locally. Production GA4 report ingestion remains unverified.

## Measurement

Historical baseline from the October 25 Search Console read: this article had 41 impressions and 0 clicks during September 25–October 22. This is not a current baseline or evidence of keyword search volume. No new Search Console/GA4 report was accessed for this edit.

At the existing manual November 22 discovery review, inspect this URL's index status and queries/impressions/clicks; compare periods and denominators explicitly because this edit has a shorter observation window. Inspect `reviewisa_store_click` separately from Cafe24 installations, first successful transfers and actual payments. Per-placement GA4 reporting needs the corresponding custom dimension; no GA administration changes were made. Do not infer channel attribution across the external store. No new schedule, advertising spend or automatic campaign extension.

## Sources

- https://reviewboost.co.kr/blog/cafe24-review-migration-checklist
- https://store.cafe24.com/kr/apps/43542
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content

## Validation

Node 24.21.0; typecheck passed; 71 Vitest files / 396 tests passed; existing Playwright smoke suite 16/16 passed. Dedicated article checks cover desktop/mobile layout, image loading, metadata/canonical/indexability and two distinct click placements. Production verification is recorded after deployment.
