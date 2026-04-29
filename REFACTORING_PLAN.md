# Refactoring Plan: reviewboost

> Analysis date: 2026-04-29  
> Analyzed by: Sonnet 4.6 (Opus 4.7 attempted but failed due to stream idle timeout in this environment)

---

## 1. Code Quality Issues Found

### Route / Architecture Issues

**`src/app/api/analyze/route.ts`**
- **Lines 189–289**: Duplicate Supabase insert logic. Admin client path (lines 189–248) and auth client path (lines 253–289) both do `insertAnalysisWithCompat` + `reviews.insert` with identical structure. Extract `persistAnalysis(client, {userId, clientIp, filename, payload, classified})` helper into `_helpers/persistence.ts`.
- **Lines 110–122**: `aiDecisionTag` string is built with verbose conditions and only used for `logger.debug`. The variable adds noise without benefit — log the raw values (`plan`, `allowLLM`, `forcedMode`) directly.
- **Lines 22–23**: `ANALYZE_MAX_DURATION_SEC = maxDuration` then immediately `ANALYZE_REQUEST_BUDGET_MS = ANALYZE_MAX_DURATION_SEC * 1000 - 1500`. The intermediate constant is pointless — just `const ANALYZE_REQUEST_BUDGET_MS = maxDuration * 1000 - 1500`.
- **Lines 36–42**: `delimiterHint()` in route.ts duplicates warning logic already inside `previewReviewCsv()` in `src/lib/csv.ts`. Remove it; the info is already in `CsvPreview.warnings`.

**`src/lib/analysis_pipeline.ts`**
- **Lines 1–12**: Multi-line JSDoc comment describes WHAT the module does — redundant given the filename and code. Remove.
- **Line 225**: `aiDiagnosticReason = "LLM_CLASSIFY_LEN_MISMATCH"` is wrong — the condition is `llm === null` (classify returned null), not a length mismatch. Rename to `"LLM_CLASSIFY_NULL"` or `"LLM_CLASSIFY_FAILED"`.
- **Lines 281**: `as const` on `{ ...k, sentiment: 'positive' as const }` — the assertion on a literal string in object spread is redundant when the outer array type already constrains it.
- **Lines 50–52**: `SUGGEST_TIMEOUT_GUARD_MS` and `CLASSIFY_TIMEOUT_GUARD_MS` are defined here AND used inside `openai_classify.ts` with a separately-defined `CLASSIFY_TIMEOUT_GUARD_MS = 2000`. Move to a shared `src/lib/timeouts.ts` constant file.

**`src/lib/openai_classify.ts`**
- **Lines 8–14**: Five `normalize*` functions are defined locally but the same pattern (`normalizeTimeBudget`, `normalizeMaxCount`, `normalizeHeaderMode`) exists in `src/lib/normalizers.ts` (imported by analysis_pipeline.ts). Deduplicate: `normalizeBatchSize`, `normalizeBatchConcurrency`, `normalizeTimeout` should move to `normalizers.ts`.
- **Lines 125–130**: `fillFallbackBatch` is a local closure that writes into `output[]`. It makes the data flow hard to follow. Convert `runBatch` to return `LlmClassification[]` and let the caller assign.

**`src/lib/analysis.ts`**
- **Lines 104–107**: Comment block in `computePriorityScore` explaining the math formula is useful but mixes score design rationale with implementation. Move to a separate `SCORE_DESIGN.md` or keep only one-line comments per factor.
- **Line 46**: `guessSentiment` falls back to `"neutral"` for text without rating even when the text contains no negative hints — but positive hints (e.g., "좋아요", "만족") are never checked. This causes systematic undercount of heuristic positives for rating-less datasets.

### TypeScript Issues

- **`src/app/api/analyze/route.ts` line 221**: `const analysisId = insertAnalysis.data?.id as string | undefined` — type cast instead of type guard. Should narrow properly via the return type of `insertAnalysisWithCompat`.
- **`src/lib/analysis_pipeline.ts` lines 78–85**: `AnalysisPipelineOutput.payload` inlines `import()` type references instead of importing them at the top. Import `UrgentReview`, `PriorityMatrixItem`, `RatingSimulation`, `PositiveKeyword`, `ActionItem` at the top of the file.
- **`src/types/common.ts`** (referenced but not read): `getErrorMessage` is imported from here in route.ts. Verify it handles `cause` chaining for wrapped errors.

### Dead Code / Unnecessary Complexity

- **`route.ts` lines 86–89**: `const forcedMode = devForcedAnalysisMode()` and `const openaiAvailable = ...` and `const useLLM = ...` — `useLLM` is computed then overridden by `effectiveUseLLM`. Compute `effectiveUseLLM` directly without the intermediate.
- **`analysis_pipeline.ts` lines 184–195**: `targetFallbacks` is built before the LLM call and passed as `fallbackClassifications`. This is correct but the variable name is misleading — call it `heuristicBaseline`.

---

## 2. Architecture Improvements

### A. Extract `persistAnalysis` helper (M)
The two nearly-identical Supabase persistence branches in `route.ts` should be extracted:
```ts
// src/app/api/analyze/_helpers/persistence.ts
export async function persistAnalysis(
  client: SupabaseClient,
  { userId, clientIp, filename, payload, classified }: PersistInput
): Promise<{ analysisId: string | null; warning?: string; error?: string }>
```
`route.ts` then becomes: try admin client, fall back to auth client, each via `persistAnalysis`.

### B. Centralize timeout/guard constants (S)
Create `src/lib/constants.ts` or `src/lib/timeouts.ts`:
```ts
export const CLASSIFY_TIMEOUT_GUARD_MS = 2000;
export const SUGGEST_TIMEOUT_GUARD_MS  = 2000;
export const TIME_BUDGET_GUARD_MS      = 1500;
```
Import from there in `analysis_pipeline.ts` and `openai_classify.ts`.

### C. `openai_classify.ts` — separate batch execution from state mutation (M)
`runBatch` currently mutates the outer `output[]` array and `failedBatchCount`/`appliedCount` variables. Refactor it to return a `BatchResult` and let the caller aggregate. This makes unit testing trivial.

### D. Add positive-sentiment heuristic keywords (S)
`src/lib/analysis.ts:guessSentiment` — add a `POSITIVE_HINTS` list alongside `NEGATIVE_HINTS` so rating-less text gets correct positive classification.

---

## 3. Test Coverage Gaps

- `analysis_pipeline.ts` has a performance test (`analysis_pipeline.perf.test.ts`) but no unit test for `pickLlmTargetIndicesByHeuristic`. That function has non-trivial weighting logic.
- `openai_classify.ts` `runBatch` error paths (parse failure, empty map, timeout risk) have no unit tests.
- `route.ts` persistence fallback logic (admin → auth client cascade) is untested.
- `analysis.ts` `computePriorityScore` weights are not tested with boundary inputs.

---

## 4. Prioritized Action Items

| # | Priority | Size | Action | File |
|---|----------|------|--------|------|
| 1 | High | S | Fix `aiDiagnosticReason = "LLM_CLASSIFY_LEN_MISMATCH"` → `"LLM_CLASSIFY_FAILED"` | `analysis_pipeline.ts:225` |
| 2 | High | S | Add positive hints to `guessSentiment` for rating-less reviews | `analysis.ts:46` |
| 3 | High | M | Extract `persistAnalysis` helper, remove duplicate admin/auth insert logic | `route.ts:189–289` |
| 4 | Medium | S | Centralize timeout guard constants (`CLASSIFY_TIMEOUT_GUARD_MS` etc.) | new `constants.ts` |
| 5 | Medium | S | Remove `delimiterHint()` from route.ts (already in csv.ts warnings) | `route.ts:36–42` |
| 6 | Medium | S | Remove `ANALYZE_MAX_DURATION_SEC` intermediate constant | `route.ts:22–23` |
| 7 | Medium | M | Move `normalizeBatchSize`, `normalizeBatchConcurrency`, `normalizeTimeout` to `normalizers.ts` | `openai_classify.ts` |
| 8 | Medium | M | Refactor `runBatch` to return `BatchResult` instead of mutating outer scope | `openai_classify.ts` |
| 9 | Medium | S | Remove `aiDecisionTag` string, log raw values directly | `route.ts:110–122` |
| 10 | Low | S | Import V2 types at top of file instead of inline `import()` | `analysis_pipeline.ts:78–85` |
| 11 | Low | S | Remove module-level JSDoc comment block | `analysis_pipeline.ts:1–12` |
| 12 | Low | M | Add unit tests for `pickLlmTargetIndicesByHeuristic`, `runBatch` error paths | new test files |
