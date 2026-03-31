import { describe, expect, it } from "vitest";
import { buildSectionSitemapXml, buildSitemapIndexXml } from "@/lib/seo/sitemap";

describe("seo sitemap builders", () => {
  it("builds a sitemap index with the section files", () => {
    const xml = buildSitemapIndexXml();

    expect(xml).toContain("/sitemaps/core.xml");
    expect(xml).toContain("/sitemaps/help.xml");
    expect(xml).toContain("/sitemaps/blog.xml");
  });

  it("excludes noindex auth pages from the core sitemap", () => {
    const xml = buildSectionSitemapXml("core");

    expect(xml).toContain("https://reviewboost.co.kr/features");
    expect(xml).toContain("https://reviewboost.co.kr/terms");
    expect(xml).not.toContain("https://reviewboost.co.kr/login");
    expect(xml).not.toContain("https://reviewboost.co.kr/signup");
  });

  it("contains only help routes in the help sitemap", () => {
    const xml = buildSectionSitemapXml("help");

    expect(xml).toContain("https://reviewboost.co.kr/help");
    expect(xml).toContain("https://reviewboost.co.kr/help/csv-checklist");
    expect(xml).not.toContain("https://reviewboost.co.kr/blog");
  });
});
