// @vitest-environment jsdom
import React from "react";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import ExtensionPage from "@/app/extension/page";
import StructuredData from "@/components/seo/StructuredData";
import { extensionProduct, extensionFaqs } from "@/lib/extension-content";
import { EXTENSION_STORE_URL } from "@/lib/extension";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { buildSectionSitemapXml } from "@/lib/seo/sitemap";
import { GET as getLlms } from "@/app/llms.txt/route";

afterEach(() => vi.unstubAllEnvs());

describe("extension discoverability", () => {
  it("renders the product and every structured answer without client JavaScript", () => {
    const doc = new DOMParser().parseFromString(renderToStaticMarkup(<ExtensionPage />), "text/html");
    const script = doc.querySelector('script[type="application/ld+json"]')!;
    const graph = JSON.parse(script.textContent!)["@graph"];
    script.remove();
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    const faq = graph.find((node: { "@type": string }) => node["@type"] === "FAQPage");
    for (const question of faq.mainEntity) {
      expect(doc.body.textContent).toContain(question.name);
      expect(doc.body.textContent).toContain(question.acceptedAnswer.text);
    }
    const app = graph.find((node: { "@type": string }) => node["@type"] === "SoftwareApplication");
    expect(app.downloadUrl).toBe(EXTENSION_STORE_URL);
    expect(doc.querySelector(`a[href="${app.downloadUrl}"]`)).not.toBeNull();
    expect(app.aggregateRating).toBeUndefined();
    expect(app.review).toBeUndefined();
    for (const feature of app.featureList) expect(doc.body.textContent).toContain(feature);
    expect(doc.body.textContent).toContain("본문 없이 별점만 있는 리뷰도 포함하도록 선택 가능");
    expect(doc.querySelector('a[href="/help/oliveyoung-review-csv-export"]')).not.toBeNull();
  });

  it("keeps advertised limits and store coverage consistent with the shipped extension", () => {
    const config = readFileSync("extension/src/lib/config.ts", "utf8");
    expect(Number(config.match(/FREE_DAILY_LIMIT = (\d+)/)?.[1])).toBe(extensionProduct.freeDailyLimit);
    expect(Number(config.match(/COLLECT_HARD_MAX = (\d+)/)?.[1])).toBe(extensionProduct.perCollectionLimit);
    const manifest = JSON.parse(readFileSync("extension/public/manifest.json", "utf8"));
    expect(manifest.homepage_url).toBe(`https://reviewboost.co.kr${extensionProduct.path}`);
    const hosts = manifest.host_permissions.join(" ");
    for (const host of ["coupang.com", "smartstore.naver.com", "brand.naver.com", "musinsa.com", "29cm.co.kr", "gmarket.co.kr", "auction.co.kr", "11st.co.kr", "ssg.com", "ohou.se", "kurly.com", "oliveyoung.co.kr", "store.kakao.com"]) {
      expect(hosts).toContain(host);
    }
  });

  it("aligns canonical, social URLs, sitemap and machine-readable product facts", async () => {
    vi.stubEnv("APP_BASE_URL", "https://reviewboost.co.kr");
    const record = getRequiredSeoPageRecord("/extension");
    const metadata = generatePageMetadata(record, { image: "/extension/opengraph-image" });
    expect(metadata.alternates?.canonical).toBe("https://reviewboost.co.kr/extension");
    expect(metadata.openGraph?.url).toBe(metadata.alternates?.canonical);
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: "https://reviewboost.co.kr/extension/opengraph-image" })]);
    const sitemap = buildSectionSitemapXml("core");
    expect(sitemap).toContain("<loc>https://reviewboost.co.kr/extension</loc>");
    expect(sitemap).not.toContain("<loc>https://reviewboost.co.kr/extension-connect</loc>");
    expect(sitemap).not.toContain("<loc>https://reviewboost.co.kr/extension-report</loc>");
    const llms = await getLlms().text();
    expect(llms).toContain("https://reviewboost.co.kr/extension)");
    for (const feature of extensionProduct.features) expect(llms).toContain(feature);
    for (const faq of extensionFaqs) expect(llms).toContain(faq.answer);
  });

  it("escapes script terminators while preserving valid structured data", () => {
    const data = { text: '</script><script>alert("example")</script>' };
    const html = renderToStaticMarkup(<StructuredData data={data} />);
    const doc = new DOMParser().parseFromString(html, "text/html");
    expect(doc.querySelectorAll("script")).toHaveLength(1);
    expect(JSON.parse(doc.querySelector("script")!.textContent!)).toEqual(data);
  });
});
