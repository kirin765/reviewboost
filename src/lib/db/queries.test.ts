import { describe, it, expect } from "vitest";
import { buildAnalysisListQueryFilter } from "./queries";

describe("buildAnalysisListQueryFilter", () => {
  it("always includes the userId in the filter description", () => {
    const f = buildAnalysisListQueryFilter("user_abc");
    expect(f.userId).toBe("user_abc");
  });

  it("rejects empty userId", () => {
    expect(() => buildAnalysisListQueryFilter("")).toThrow();
  });
});
