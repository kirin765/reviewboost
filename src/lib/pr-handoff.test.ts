import { describe, expect, it } from "vitest";

import {
  assertValidPrHandoffMetadata,
  discoverPrMetadataFromOpenPullRequests,
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

  it("reviewer consumes explicit PR keys when present", () => {
    const ready = resolvePrMetadataForReview({
      stepOutput: [
        "PR_NUMBER: 321",
        "PR_URL: https://github.com/kirin765/reviewboost/pull/321",
        "PR_BRANCH: feature-dev/reviewboost-uiux-spec",
        "PR_BASE: main",
      ].join("\n"),
    });

    expect(ready).toEqual({
      status: "READY",
      source: "step-output",
      metadata: {
        PR_NUMBER: "321",
        PR_URL: "https://github.com/kirin765/reviewboost/pull/321",
        PR_BRANCH: "feature-dev/reviewboost-uiux-spec",
        PR_BASE: "main",
      },
    });
  });

  it("reviewer resolves missing PR keys via branch/open PR fallback discovery", () => {
    const resolved = resolvePrMetadataForReview({
      stepOutput: "PR_NUMBER: \nPR_URL: \nPR_BRANCH: feature-dev/reviewboost-uiux-spec\nPR_BASE: main",
      fallbackDiscovery: () => ({
        branchHint: "feature-dev/reviewboost-uiux-spec",
        openPullRequests: [
          {
            number: 789,
            url: "https://github.com/kirin765/reviewboost/pull/789",
            headRefName: "feature-dev/reviewboost-uiux-spec",
            baseRefName: "main",
          },
          {
            number: 790,
            url: "https://github.com/kirin765/reviewboost/pull/790",
            headRefName: "other-branch",
            baseRefName: "main",
          },
        ],
      }),
    });

    expect(resolved).toEqual({
      status: "READY",
      source: "fallback",
      metadata: {
        PR_NUMBER: "789",
        PR_URL: "https://github.com/kirin765/reviewboost/pull/789",
        PR_BRANCH: "feature-dev/reviewboost-uiux-spec",
        PR_BASE: "main",
      },
    });
  });

  it("returns SKIPPED_WITH_WARNING when fallback discovery cannot resolve a unique PR", () => {
    const skipped = resolvePrMetadataForReview({
      stepOutput: "PR_NUMBER: \nPR_URL: \nPR_BRANCH: feature-dev/reviewboost-uiux-spec\nPR_BASE: main",
      fallbackDiscovery: () => ({
        branchHint: "feature-dev/reviewboost-uiux-spec",
        openPullRequests: [
          {
            number: 800,
            url: "https://github.com/kirin765/reviewboost/pull/800",
            headRefName: "feature-dev/reviewboost-uiux-spec",
            baseRefName: "main",
          },
          {
            number: 801,
            url: "https://github.com/kirin765/reviewboost/pull/801",
            headRefName: "feature-dev/reviewboost-uiux-spec",
            baseRefName: "main",
          },
        ],
      }),
    });

    expect(skipped.status).toBe("SKIPPED_WITH_WARNING");
    if (skipped.status === "SKIPPED_WITH_WARNING") {
      expect(skipped.reason).toContain("fallback PR discovery did not resolve a unique open PR");
      expect(skipped.requiredFollowUp).toContain("PR_NUMBER");
    }
  });

  it("discovery helper can recover from single-open-PR lookup without branch hint", () => {
    const discovered = discoverPrMetadataFromOpenPullRequests({
      branchHint: null,
      openPullRequests: [
        {
          number: 802,
          url: "https://github.com/kirin765/reviewboost/pull/802",
          headRefName: "feature-dev/reviewboost-uiux-spec",
          baseRefName: "main",
        },
      ],
    });

    expect(discovered).toEqual({
      PR_NUMBER: "802",
      PR_URL: "https://github.com/kirin765/reviewboost/pull/802",
      PR_BRANCH: "feature-dev/reviewboost-uiux-spec",
      PR_BASE: "main",
    });
  });
});
