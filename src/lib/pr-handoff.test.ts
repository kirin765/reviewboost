import { describe, expect, it } from "vitest";

import {
  assertValidPrHandoffMetadata,
  formatPrHandoffOutput,
  metadataFromGhPullRequestPayload,
  parsePrHandoffOutput,
  resolvePrMetadataForReview,
} from "./pr-handoff";

describe("pr-handoff contract", () => {
  it("formats required PR handoff keys for final step output", () => {
    const output = formatPrHandoffOutput({
      PR_NUMBER: "123",
      PR_URL: "https://github.com/kirin765/reviewboost/pull/123",
      PR_BRANCH: "feature-dev/reviewboost-uiux-spec",
      PR_BASE: "main",
    });

    expect(output).toContain("PR_NUMBER: 123");
    expect(output).toContain("PR_URL: https://github.com/kirin765/reviewboost/pull/123");
    expect(output).toContain("PR_BRANCH: feature-dev/reviewboost-uiux-spec");
    expect(output).toContain("PR_BASE: main");
  });

  it("fails validation when required keys are missing or empty", () => {
    expect(() =>
      assertValidPrHandoffMetadata({
        PR_NUMBER: "",
        PR_URL: "https://github.com/kirin765/reviewboost/pull/123",
        PR_BRANCH: "feature",
        PR_BASE: "main",
      }),
    ).toThrow(/Missing required PR handoff keys: PR_NUMBER/);

    expect(() => assertValidPrHandoffMetadata(parsePrHandoffOutput("PR_NUMBER: 123"))).toThrow(
      /PR_URL, PR_BRANCH, PR_BASE/,
    );
  });

  it("builds metadata from gh PR payload and trims values", () => {
    const metadata = metadataFromGhPullRequestPayload({
      number: 456,
      url: " https://github.com/kirin765/reviewboost/pull/456 ",
      headRefName: " feature-dev/reviewboost-uiux-spec ",
      baseRefName: " main ",
    });

    expect(metadata).toEqual({
      PR_NUMBER: "456",
      PR_URL: "https://github.com/kirin765/reviewboost/pull/456",
      PR_BRANCH: "feature-dev/reviewboost-uiux-spec",
      PR_BASE: "main",
    });
  });

  it("reviewer uses fallback discovery before skipping with warning", () => {
    const fallbackReady = resolvePrMetadataForReview({
      stepOutput: "PR_NUMBER: \nPR_URL: \n",
      fallbackLookup: () => ({
        PR_NUMBER: "789",
        PR_URL: "https://github.com/kirin765/reviewboost/pull/789",
        PR_BRANCH: "feature-dev/reviewboost-uiux-spec",
        PR_BASE: "main",
      }),
    });

    expect(fallbackReady).toEqual({
      status: "READY",
      source: "fallback",
      metadata: {
        PR_NUMBER: "789",
        PR_URL: "https://github.com/kirin765/reviewboost/pull/789",
        PR_BRANCH: "feature-dev/reviewboost-uiux-spec",
        PR_BASE: "main",
      },
    });

    const skipped = resolvePrMetadataForReview({
      stepOutput: "PR_NUMBER: \nPR_URL: \n",
      fallbackLookup: () => null,
    });

    expect(skipped.status).toBe("SKIPPED_WITH_WARNING");
    if (skipped.status === "SKIPPED_WITH_WARNING") {
      expect(skipped.reason).toContain("missing or empty");
      expect(skipped.requiredFollowUp).toContain("PR_NUMBER");
    }
  });
});
