import { describe, expect, it } from "vitest";
import { GO_SLUG_PATTERN, goLinks, goPath, resolveGoLink } from "./go-links";

describe("go-links", () => {
  it("resolves registered slugs case-insensitively", () => {
    expect(resolveGoLink("reviewisa-cafe24-story-20261031")?.destination).toBe("https://store.cafe24.com/kr/apps/43542");
    expect(resolveGoLink(" ReviewISA-Cafe24-Story-20261031 ")?.slug).toBe("reviewisa-cafe24-story-20261031");
  });

  it("rejects unknown and malformed slugs", () => {
    expect(resolveGoLink("nope")).toBeNull();
    expect(resolveGoLink("../admin")).toBeNull();
    expect(resolveGoLink("/go/reviewisa")).toBeNull();
  });

  it("keeps slugs unique, pattern-safe, and destinations absolute https", () => {
    const slugs = goLinks.map((link) => link.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const link of goLinks) {
      expect(link.slug).toMatch(GO_SLUG_PATTERN);
      expect(link.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new URL(link.destination).protocol).toBe("https:");
      expect(goPath(link.slug)).toBe(`/go/${link.slug}`);
    }
  });
});
