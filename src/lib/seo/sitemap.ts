import { buildCanonicalUrl } from "@/lib/seo/url";
import { getBaseUrl } from "@/lib/seo/metadata";
import { getSeoRecordsForSitemap } from "@/lib/seo/page-registry";

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function buildSitemapIndexXml() {
  const baseUrl = getBaseUrl();
  const urls = ["/sitemaps/core.xml", "/sitemaps/help.xml", "/sitemaps/blog.xml"];
  const body = urls
    .map((path) => {
      const loc = buildCanonicalUrl(baseUrl, path);
      return `<sitemap><loc>${xmlEscape(loc)}</loc></sitemap>`;
    })
    .join("");

  return `${XML_HEADER}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export function buildSectionSitemapXml(section: "core" | "help" | "blog") {
  const baseUrl = getBaseUrl();
  const body = getSeoRecordsForSitemap(section)
    .map((record) => {
      const loc = buildCanonicalUrl(baseUrl, record.canonicalPath);
      return `<url><loc>${xmlEscape(loc)}</loc><lastmod>${xmlEscape(record.updatedAt)}</lastmod></url>`;
    })
    .join("");

  return `${XML_HEADER}<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}
