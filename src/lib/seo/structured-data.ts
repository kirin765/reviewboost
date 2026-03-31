import { buildCanonicalUrl } from "@/lib/seo/url";
import { getBaseUrl } from "@/lib/seo/metadata";
import type { SeoBreadcrumb, SeoPageRecord } from "@/lib/seo/page-registry";

function absoluteUrl(path: string) {
  return buildCanonicalUrl(getBaseUrl(), path);
}

function breadcrumbList(items: SeoBreadcrumb[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: absoluteUrl(item.path)
    }))
  };
}

function organizationNode() {
  return {
    "@type": "Organization",
    "@id": absoluteUrl("/#organization"),
    name: "ReviewBoost",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
    email: "mailto:kwan765@naver.com"
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": absoluteUrl("/#website"),
    url: absoluteUrl("/"),
    name: "ReviewBoost",
    inLanguage: "ko",
    description:
      "쿠팡·스마트스토어 리뷰 데이터를 분석하고 부정리뷰 대응, FAQ 작성, 상세페이지 개선 문구까지 연결하는 AI 리뷰 분석 도구"
  };
}

function webpageNode(record: SeoPageRecord) {
  return {
    "@type": "WebPage",
    "@id": `${absoluteUrl(record.canonicalPath)}#webpage`,
    url: absoluteUrl(record.canonicalPath),
    name: record.title,
    description: record.description,
    inLanguage: "ko",
    isPartOf: { "@id": absoluteUrl("/#website") },
    about: record.primaryKeyword
  };
}

export function createGlobalStructuredData() {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationNode(), websiteNode()]
  };
}

export function createSoftwareApplicationStructuredData(record: SeoPageRecord) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "SoftwareApplication",
        "@id": `${absoluteUrl(record.canonicalPath)}#software`,
        name: "ReviewBoost",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: absoluteUrl(record.canonicalPath),
        description: record.description,
        inLanguage: "ko",
        offers: {
          "@type": "Offer",
          price: "0",
          priceCurrency: "KRW",
          description: "무료 플랜"
        }
      },
      breadcrumbList(record.breadcrumbs)
    ]
  };
}

export function createCollectionPageStructuredData(
  record: SeoPageRecord,
  items: Array<{ name: string; path: string }>
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        ...webpageNode(record),
        "@type": "CollectionPage",
        hasPart: items.map((item) => ({
          "@type": "WebPage",
          name: item.name,
          url: absoluteUrl(item.path)
        }))
      },
      breadcrumbList(record.breadcrumbs)
    ]
  };
}

export function createArticleStructuredData(
  record: SeoPageRecord,
  options: {
    headline?: string;
    datePublished?: string;
  } = {}
) {
  const canonicalUrl = absoluteUrl(record.canonicalPath);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Article",
        "@id": `${canonicalUrl}#article`,
        mainEntityOfPage: canonicalUrl,
        headline: options.headline ?? record.title,
        description: record.description,
        datePublished: options.datePublished ?? record.updatedAt,
        dateModified: record.updatedAt,
        author: {
          "@type": "Organization",
          name: "ReviewBoost"
        },
        publisher: {
          "@id": absoluteUrl("/#organization")
        },
        image: absoluteUrl("/opengraph-image")
      },
      breadcrumbList(record.breadcrumbs)
    ]
  };
}

export function createPricingStructuredData(record: SeoPageRecord) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OfferCatalog",
        "@id": `${absoluteUrl(record.canonicalPath)}#offers`,
        name: "ReviewBoost 요금제",
        url: absoluteUrl(record.canonicalPath),
        itemListElement: [
          {
            "@type": "Offer",
            name: "Starter",
            price: "0",
            priceCurrency: "KRW",
            url: absoluteUrl("/pricing")
          },
          {
            "@type": "Offer",
            name: "Basic",
            price: "19000",
            priceCurrency: "KRW",
            url: absoluteUrl("/pricing")
          },
          {
            "@type": "Offer",
            name: "Pro",
            price: "45000",
            priceCurrency: "KRW",
            url: absoluteUrl("/pricing")
          }
        ]
      },
      breadcrumbList(record.breadcrumbs)
    ]
  };
}

export function createWebPageStructuredData(record: SeoPageRecord) {
  return {
    "@context": "https://schema.org",
    "@graph": [webpageNode(record), breadcrumbList(record.breadcrumbs)]
  };
}
