import type { Metadata } from "next";
import { buildCanonicalUrl } from "@/lib/seo/url";
import { SEO_KEYWORDS, type SeoPageRecord } from "@/lib/seo/page-registry";

const DEFAULT_OG_IMAGE = { url: "/opengraph-image", width: 1200, height: 630, alt: "ReviewBoost" };

export function getBaseUrl() {
  return process.env.APP_BASE_URL || "https://reviewboost.co.kr";
}

function uniqueKeywords(values: string[]) {
  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean)
    )
  );
}

export function generatePageMetadata(
  record: SeoPageRecord,
  options: {
    keywords?: string[];
    openGraphType?: "website" | "article";
    publishedTime?: string;
  } = {}
): Metadata {
  const title = record.title;
  const canonicalUrl = buildCanonicalUrl(getBaseUrl(), record.canonicalPath);
  const keywords = uniqueKeywords([...SEO_KEYWORDS, record.primaryKeyword, ...(options.keywords ?? [])]);
  const robots: Metadata["robots"] = record.indexable
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large" as const,
          "max-snippet": -1
        }
      }
    : {
        index: false,
        follow: false,
        googleBot: {
          index: false,
          follow: false
        }
      };

  return {
    title,
    description: record.description,
    keywords,
    alternates: { canonical: record.canonicalPath },
    robots,
    openGraph: {
      type: options.openGraphType ?? "website",
      locale: "ko_KR",
      url: canonicalUrl,
      siteName: "ReviewBoost",
      title,
      description: record.description,
      ...(options.publishedTime ? { publishedTime: options.publishedTime } : {}),
      modifiedTime: record.updatedAt,
      images: [DEFAULT_OG_IMAGE]
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: record.description,
      images: [DEFAULT_OG_IMAGE]
    }
  };
}
