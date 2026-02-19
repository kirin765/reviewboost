# PR Handoff Contract (US-09)

To prevent downstream reviewer failures, PR automation **must always emit** these final output keys with non-empty values:

- `PR_NUMBER`
- `PR_URL`
- `PR_BRANCH`
- `PR_BASE`

## Required Output Format

```text
PR_NUMBER: 123
PR_URL: https://github.com/<owner>/<repo>/pull/123
PR_BRANCH: feature/my-branch
PR_BASE: main
```

## PR Step Rules

1. Build metadata from GitHub CLI/API PR payload (`number`, `url`, `headRefName`, `baseRefName`).
2. Validate all required keys are present and non-empty **before** marking PR step complete.
3. If validation fails, fail PR step early with an explicit missing-keys error.

CLI helper:

```bash
# Convert gh JSON to handoff output (fails if any required key is empty)
node scripts/pr-handoff-output.js from-gh-json --json "$(gh pr view --json number,url,headRefName,baseRefName)"

# Validate an already generated output payload
cat /tmp/antfarm-step-output.txt | node scripts/pr-handoff-output.js validate
```

## Reviewer Step Rules

If `PR_NUMBER` / `PR_URL` are missing in step output:

1. Attempt fallback discovery (branch-based or open PR lookup).
2. If fallback still cannot resolve a unique PR, mark reviewer step as `SKIPPED_WITH_WARNING`.
3. Include clear reason and required follow-up, and avoid hard-failing the whole run solely due to missing PR identifiers.
