# SEO-001: SEO Directory Data Contract + Source Adapters

## Route strategy prep
- A single normalized build-time payload (`SeoDirectoryData`) is generated before static route generation.
- Stable IDs are deterministic (`stableId`) so route generation and linking do not depend on DB auto IDs.
- Slugs are URL-safe via `slugify/ensureSlug` and can be reused by upcoming route stories.

## Sitemap strategy prep
- The loader returns deduplicated `listings/categories/tools/countries/cities` arrays so sitemap builders can stream over a single trusted source.
- The adapter is file-based (`data/seo/directory.json` by default) and supports in-memory payload injection for fast tests and CI.

## Internal-linking algorithm prep
- Normalized relations are explicit: listing -> `countryId`, `cityId`, `categoryIds`, `toolIds`.
- This makes O(n) indexing straightforward for related-links blocks (same city/country/category/tool).

## Validation strategy
- Strict zod schemas reject malformed records at build time.
- Errors include record index and path (e.g. `listings[3].city`) for actionable fixes.
