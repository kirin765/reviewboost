import { describe, expect, it } from "vitest";

import { SeoDataContractError } from "@/lib/seo/data-contract";
import { normalizeSeoDirectoryData } from "@/lib/seo/source-adapters";

describe("normalizeSeoDirectoryData", () => {
  it("returns normalized arrays with stable IDs", () => {
    const payload = {
      categories: [{ sourceId: "cat-marketing", name: "Marketing Automation" }],
      tools: [{ sourceId: "tool-zapier", name: "Zapier" }],
      listings: [
        {
          sourceId: "agency-001",
          name: "Alpha Automations",
          country: "United States",
          city: "Austin",
          categoryNames: ["Marketing Automation"],
          toolNames: ["Zapier"],
        },
        {
          sourceId: "agency-002",
          name: "Beta Ops",
          country: "United States",
          city: "Austin",
          categoryNames: ["Marketing Automation"],
          toolNames: ["Zapier"],
        },
      ],
    };

    const first = normalizeSeoDirectoryData(payload);
    const second = normalizeSeoDirectoryData(payload);

    expect(first.categories).toHaveLength(1);
    expect(first.tools).toHaveLength(1);
    expect(first.countries).toHaveLength(1);
    expect(first.cities).toHaveLength(1);
    expect(first.listings).toHaveLength(2);

    expect(first.listings[0].id).toBe(second.listings[0].id);
    expect(first.categories[0].slug).toBe("marketing-automation");
    expect(first.countries[0].slug).toBe("united-states");
    expect(first.cities[0].slug).toBe("austin");
  });

  it("throws actionable errors for malformed records", () => {
    expect(() =>
      normalizeSeoDirectoryData({
        categories: [],
        tools: [],
        listings: [
          {
            name: "Missing City",
            country: "Korea",
            categoryNames: [],
            toolNames: [],
          },
        ],
      })
    ).toThrowError(SeoDataContractError);

    expect(() =>
      normalizeSeoDirectoryData({
        categories: [{ name: "CRM" }],
        tools: [],
        listings: [
          {
            name: "Unknown Category",
            country: "Korea",
            city: "Seoul",
            categoryNames: ["Not Defined"],
            toolNames: [],
          },
        ],
      })
    ).toThrow(/listings\[0\]\.categoryNames: unknown category/);
  });
});
