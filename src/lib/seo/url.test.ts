import { describe, expect, it } from "vitest";

import { assignUniqueSlugs, buildCanonicalUrl, slugify } from "@/lib/seo/url";

describe("SEO URL utilities", () => {
  it("slugifies non-ASCII input deterministically", () => {
    expect(slugify("São Paulo")).toBe("sao-paulo");
    expect(slugify("Málaga España")).toBe("malaga-espana");
    expect(slugify("Łódź + Æsir")).toBe("lodz-aesir");
    expect(slugify("東京")).toBe("");
  });

  it("assigns deterministic unique slugs for collisions", () => {
    const first = assignUniqueSlugs(
      [
        { key: "2", value: "Sao Paulo" },
        { key: "1", value: "São Paulo" },
        { key: "3", value: "SÃO PAULO" },
      ],
      "city"
    );

    const second = assignUniqueSlugs(
      [
        { key: "3", value: "SÃO PAULO" },
        { key: "2", value: "Sao Paulo" },
        { key: "1", value: "São Paulo" },
      ],
      "city"
    );

    expect(first.get("1")).toBe("sao-paulo");
    expect(first.get("2")).toBe("sao-paulo-2");
    expect(first.get("3")).toBe("sao-paulo-3");

    expect(Array.from(first.entries())).toEqual(Array.from(second.entries()));
  });

  it("builds canonical URLs with normalized slashes and encoding", () => {
    expect(buildCanonicalUrl("https://reviewboost.ai/", ["location", "South Korea", "Seoul"])).toBe(
      "https://reviewboost.ai/location/South%20Korea/Seoul"
    );
    expect(buildCanonicalUrl("https://reviewboost.ai", "/")).toBe("https://reviewboost.ai/");
  });
});
