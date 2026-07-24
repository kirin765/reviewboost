import { buildCanonicalUrl } from "@/lib/seo/url";
import { getBaseUrl } from "@/lib/seo/metadata";
import { getGatesForPlan } from "@/lib/plan_gates";
import type { SeoBreadcrumb, SeoPageRecord } from "@/lib/seo/page-registry";

function absoluteUrl(path: string) {
  return buildCanonicalUrl(getBaseUrl(), path);
}

// canonicalizePath percent-encodes "#", so fragments must be appended after URL build
function organizationId() {
  return `${absoluteUrl("/")}#organization`;
}

function websiteId() {
  return `${absoluteUrl("/")}#website`;
}

function pricingOffers() {
  const plans = [
    { name: "Starter", price: "0", label: "무료 플랜", tier: "free" as const },
    { name: "Basic", price: "19000", label: "월 19,000원", tier: "basic" as const },
    { name: "Pro", price: "45000", label: "월 45,000원", tier: "pro" as const }
  ];

  const offers = plans.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    description: `${plan.label} — 월 ${getGatesForPlan(plan.tier).monthlyAnalysisLimit.toLocaleString("ko-KR")}회 리뷰 분석`,
    price: plan.price,
    priceCurrency: "KRW",
    availability: "https://schema.org/InStock",
    url: absoluteUrl("/pricing")
  }));

  offers.push({
    "@type": "Offer",
    name: "Extension",
    description: "월 4,900원 — Chrome 익스텐션 리뷰 수집 하루 2,000개 (Basic·Pro 구독 시 포함)",
    price: "4900",
    priceCurrency: "KRW",
    availability: "https://schema.org/InStock",
    url: absoluteUrl("/pricing")
  });

  return offers;
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
    "@id": organizationId(),
    name: "ReviewBoost",
    url: absoluteUrl("/"),
    logo: absoluteUrl("/icon.svg"),
    email: "kwan765@naver.com",
    sameAs: ["https://sajangbu.com"]
  };
}

function websiteNode() {
  return {
    "@type": "WebSite",
    "@id": websiteId(),
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
    isPartOf: { "@id": websiteId() },
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
      {
        "@type": "SoftwareApplication",
        "@id": `${absoluteUrl(record.canonicalPath)}#software`,
        name: "ReviewBoost",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: absoluteUrl(record.canonicalPath),
        description: record.description,
        inLanguage: "ko",
        featureList: [
          "리뷰 CSV 업로드와 자동 컬럼 확인",
          "감성 분석과 이슈 카테고리 분류",
          "부정 키워드와 긴급 리뷰 탐지",
          "상세페이지·CS·FAQ 개선 액션 제안",
          "PDF 리포트 생성"
        ],
        offers: pricingOffers()
      },
      breadcrumbList(record.breadcrumbs)
    ]
  };
}

export function createFaqStructuredData(
  record: SeoPageRecord,
  items: Array<{ question: string; answer: string }>
) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "FAQPage",
        "@id": `${absoluteUrl(record.canonicalPath)}#faq`,
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer
          }
        }))
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
    image?: string;
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
          "@id": organizationId()
        },
        publisher: {
          "@id": organizationId()
        },
        image: options.image ? absoluteUrl(options.image) : absoluteUrl("/opengraph-image")
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
        itemListElement: pricingOffers()
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
