import { describe, expect, it, afterEach } from "vitest";
import { clerkFrontendApiHost } from "./security";

const ORIGINAL_PK = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

afterEach(() => {
  if (ORIGINAL_PK === undefined) delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  else process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = ORIGINAL_PK;
});

describe("clerkFrontendApiHost", () => {
  it("derives the prod custom-domain FAPI host from pk_live_", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_live_Y2xlcmsucmV2aWV3Ym9vc3QuY28ua3Ik";
    expect(clerkFrontendApiHost()).toBe("clerk.reviewboost.co.kr");
  });

  it("derives the dev instance FAPI host from pk_test_", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_YXdhaXRlZC1tdXN0YW5nLTI4LmNsZXJrLmFjY291bnRzLmRldiQ";
    expect(clerkFrontendApiHost()).toBe("awaited-mustang-28.clerk.accounts.dev");
  });

  it("returns null when the publishable key is missing", () => {
    delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    expect(clerkFrontendApiHost()).toBeNull();
  });

  it("returns null for an unparseable key", () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "not-a-valid-key";
    expect(clerkFrontendApiHost()).toBeNull();
  });
});
