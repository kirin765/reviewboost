import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import SupportedSites from "@/components/marketing/SupportedSites";
import { supportedSites, extensionStores } from "@/lib/supported-sites";
import { PLATFORMS } from "../../../extension/src/lib/platforms";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { createExtensionStructuredData } from "@/lib/seo/structured-data";
import { buildSectionSitemapXml } from "@/lib/seo/sitemap";
import { GET } from "@/app/llms.txt/route";

describe("public supported-site discovery", () => {
  it("advertises exactly the platforms shipped by the extension", () => {
    expect(supportedSites.map((site) => site.key).sort()).toEqual(["coupang", "smartstore", ...PLATFORMS.map((site) => site.key)].sort());
    for (const platform of PLATFORMS) {
      expect(supportedSites.find((site) => site.key === platform.key)?.name).toBe(platform.label);
    }
  });

  it("renders all sites and version requirements in HTML without JavaScript", () => {
    for (const detailed of [false, true]) {
      const html = renderToStaticMarkup(<SupportedSites detailed={detailed} />);
      for (const site of supportedSites) expect(html).toContain(site.name);
      expect(html).toContain("1.5.2");
      expect(html).toContain("/help/oliveyoung-review-csv-export");
    }
  });

  it("keeps canonical metadata, structured data and sitemaps discoverable", () => {
    const record = getRequiredSeoPageRecord("/extension");
    const metadata = generatePageMetadata(record);
    expect(metadata.alternates?.canonical).toMatch(/\/extension$/);
    expect(metadata.description).toContain("올리브영");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    const graph = createExtensionStructuredData(record)["@graph"];
    const application = graph[0] as { featureList: string[]; downloadUrl: string[] };
    expect(application.featureList).toHaveLength(supportedSites.length);
    for (const site of supportedSites) expect(application.featureList.some((feature) => feature.includes(site.name))).toBe(true);
    expect(application.downloadUrl).toEqual(extensionStores.map((store) => store.url));
    expect(buildSectionSitemapXml("core")).toContain("/extension</loc>");
    expect(buildSectionSitemapXml("help")).toContain("/help/oliveyoung-review-csv-export</loc>");
  });

  it("includes every supported site and the Olive Young guide in the text discovery endpoint", async () => {
    const text = await GET().text();
    for (const site of supportedSites) expect(text).toContain(site.name);
    expect(text).toContain("/help/oliveyoung-review-csv-export");
    expect(text).toContain("1.5.2");
  });
});
