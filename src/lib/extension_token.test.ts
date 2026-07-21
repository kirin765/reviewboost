import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  EXTENSION_TOKEN_TTL_MS,
  isExtensionTokenConfigured,
  issueExtensionToken,
  verifyExtensionToken
} from "./extension_token";

const ORIGINAL = process.env.CLERK_SECRET_KEY;

beforeEach(() => {
  process.env.CLERK_SECRET_KEY = "sk_test_secret_for_unit_tests";
});

afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.CLERK_SECRET_KEY;
  else process.env.CLERK_SECRET_KEY = ORIGINAL;
});

describe("extension token", () => {
  it("round-trips a valid token", () => {
    const issued = issueExtensionToken("user_123");
    expect(issued).not.toBeNull();
    expect(issued!.expiresAt).toBeGreaterThan(Date.now());
    expect(verifyExtensionToken(issued!.token)).toEqual({ userId: "user_123" });
  });

  it("rejects a tampered payload", () => {
    const issued = issueExtensionToken("user_123")!;
    const [payload, sig] = issued.token.split(".");
    const forged = Buffer.from(JSON.stringify({ v: "v1", uid: "user_evil", exp: Date.now() + 1000 })).toString(
      "base64url"
    );
    expect(verifyExtensionToken(`${forged}.${sig}`)).toBeNull();
    expect(verifyExtensionToken(`${payload}.AAAA`)).toBeNull();
  });

  it("rejects an expired token", () => {
    const issued = issueExtensionToken("user_123", Date.now() - EXTENSION_TOKEN_TTL_MS - 1000)!;
    expect(verifyExtensionToken(issued.token)).toBeNull();
  });

  it("rejects garbage input", () => {
    expect(verifyExtensionToken(null)).toBeNull();
    expect(verifyExtensionToken("")).toBeNull();
    expect(verifyExtensionToken("not-a-token")).toBeNull();
    expect(verifyExtensionToken("a.b.c")).toBeNull();
  });

  it("is disabled without CLERK_SECRET_KEY", () => {
    delete process.env.CLERK_SECRET_KEY;
    expect(isExtensionTokenConfigured()).toBe(false);
    expect(issueExtensionToken("user_123")).toBeNull();
    expect(verifyExtensionToken("anything")).toBeNull();
  });

  it("tokens issued under a different secret do not verify", () => {
    const issued = issueExtensionToken("user_123")!;
    process.env.CLERK_SECRET_KEY = "sk_test_other_secret";
    expect(verifyExtensionToken(issued.token)).toBeNull();
  });
});
