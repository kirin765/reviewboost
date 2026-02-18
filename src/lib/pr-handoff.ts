export const REQUIRED_PR_HANDOFF_KEYS = [
  "PR_NUMBER",
  "PR_URL",
  "PR_BRANCH",
  "PR_BASE",
] as const;

export type PrHandoffKey = (typeof REQUIRED_PR_HANDOFF_KEYS)[number];

export type PrHandoffMetadata = {
  PR_NUMBER: string;
  PR_URL: string;
  PR_BRANCH: string;
  PR_BASE: string;
};

export type GhPullRequestPayload = {
  number?: number | string | null;
  url?: string | null;
  headRefName?: string | null;
  baseRefName?: string | null;
};

function normalizeValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

export function formatPrHandoffOutput(metadata: PrHandoffMetadata): string {
  return REQUIRED_PR_HANDOFF_KEYS.map((key) => `${key}: ${metadata[key]}`).join("\n");
}

export function parsePrHandoffOutput(output: string): Partial<PrHandoffMetadata> {
  const metadata: Partial<PrHandoffMetadata> = {};

  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z_]+):\s*(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (REQUIRED_PR_HANDOFF_KEYS.includes(key as PrHandoffKey)) {
      metadata[key as PrHandoffKey] = normalizeValue(rawValue);
    }
  }

  return metadata;
}

export function validatePrHandoffMetadata(
  metadata: Partial<PrHandoffMetadata>,
): metadata is PrHandoffMetadata {
  return REQUIRED_PR_HANDOFF_KEYS.every((key) => normalizeValue(metadata[key]).length > 0);
}

export function assertValidPrHandoffMetadata(
  metadata: Partial<PrHandoffMetadata>,
): PrHandoffMetadata {
  const missingKeys = REQUIRED_PR_HANDOFF_KEYS.filter(
    (key) => normalizeValue(metadata[key]).length === 0,
  );

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required PR handoff keys: ${missingKeys.join(", ")}. Required keys: ${REQUIRED_PR_HANDOFF_KEYS.join(", ")}`,
    );
  }

  return metadata as PrHandoffMetadata;
}

export function metadataFromGhPullRequestPayload(payload: GhPullRequestPayload): PrHandoffMetadata {
  return assertValidPrHandoffMetadata({
    PR_NUMBER: normalizeValue(payload.number),
    PR_URL: normalizeValue(payload.url),
    PR_BRANCH: normalizeValue(payload.headRefName),
    PR_BASE: normalizeValue(payload.baseRefName),
  });
}

export type ReviewerResolutionResult =
  | {
      status: "READY";
      metadata: PrHandoffMetadata;
      source: "step-output" | "fallback";
    }
  | {
      status: "SKIPPED_WITH_WARNING";
      reason: string;
      requiredFollowUp: string;
    };

export function resolvePrMetadataForReview(params: {
  stepOutput: string;
  fallbackLookup?: () => Partial<PrHandoffMetadata> | null;
}): ReviewerResolutionResult {
  const parsed = parsePrHandoffOutput(params.stepOutput);

  if (validatePrHandoffMetadata(parsed)) {
    return {
      status: "READY",
      metadata: parsed,
      source: "step-output",
    };
  }

  const fallback = params.fallbackLookup?.() ?? null;

  if (fallback && validatePrHandoffMetadata(fallback)) {
    return {
      status: "READY",
      metadata: fallback,
      source: "fallback",
    };
  }

  return {
    status: "SKIPPED_WITH_WARNING",
    reason:
      "PR_NUMBER/PR_URL are missing or empty in PR step output and fallback PR discovery did not resolve a unique open PR.",
    requiredFollowUp:
      "Re-run PR step with explicit PR_NUMBER, PR_URL, PR_BRANCH, and PR_BASE output keys or provide PR metadata manually.",
  };
}
