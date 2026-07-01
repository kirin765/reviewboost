import { blogPosts } from "@/lib/blog-posts";

export type SeoSection =
  | "home"
  | "features"
  | "help"
  | "blog"
  | "pricing"
  | "tools"
  | "legal"
  | "auth"
  | "workspace";

export type SeoSchemaKind =
  | "softwareApplication"
  | "collectionPage"
  | "article"
  | "offerCatalog"
  | "webPage";

export interface SeoBreadcrumb {
  label: string;
  path: string;
}

export interface SeoPageRecord {
  section: SeoSection;
  slug: string;
  title: string;
  description: string;
  primaryKeyword: string;
  canonicalPath: string;
  updatedAt: string;
  schema: SeoSchemaKind[];
  indexable: boolean;
  breadcrumbs: SeoBreadcrumb[];
}

type BlogRecordMeta = {
  updatedAt: string;
  primaryKeyword: string;
};

const HOME_BREADCRUMB: SeoBreadcrumb = { label: "홈", path: "/" };

export const SEO_KEYWORDS = [
  "쿠팡 리뷰 분석",
  "스마트스토어 리뷰 분석",
  "AI 리뷰 분석",
  "리뷰 분석 툴",
  "리뷰 CSV 분석",
  "고객 리뷰 분석",
  "리뷰 키워드 분석",
  "감성 분석 툴",
  "쿠팡 부정리뷰 대응",
  "부정리뷰 답글",
  "리뷰 답글 템플릿",
  "쿠팡 별점 낮아지는 이유",
  "별점 관리",
  "리뷰 기반 FAQ",
  "상세페이지 개선",
  "리뷰 데이터 분석",
  "쿠팡 리뷰 CSV 추출",
  "스마트스토어 리뷰 CSV 추출",
  "스마트스토어 리뷰 관리",
  "쿠팡 매출 올리는 법",
  "이커머스 리뷰 분석",
  "셀러 리뷰 관리",
  "리뷰 리포트 생성",
  "쿠팡 셀러 툴",
  "스마트스토어 셀러 툴"
] as const;

export const QUESTION_LANDING_QUEUE = [
  "쿠팡 리뷰 CSV는 어떻게 추출하나요?",
  "스마트스토어 리뷰는 어떻게 한 번에 분석하나요?",
  "쿠팡 부정리뷰가 많을 때 무엇부터 고쳐야 하나요?",
  "쿠팡 별점이 떨어지는 이유는 어떻게 찾나요?",
  "리뷰 답글을 AI로 자동화할 수 있나요?",
  "리뷰 데이터를 상세페이지 개선에 어떻게 쓰나요?",
  "리뷰로 FAQ를 만드는 가장 쉬운 방법은 무엇인가요?",
  "리뷰 분석 리포트는 어떻게 공유하나요?",
  "로그인 없이 리뷰 분석이 가능한가요?",
  "쿠팡 매출을 올리려면 리뷰를 어떻게 봐야 하나요?"
] as const;

function breadcrumbs(...items: SeoBreadcrumb[]) {
  return [HOME_BREADCRUMB, ...items];
}

const publicRecords: SeoPageRecord[] = [
  {
    section: "home",
    slug: "home",
    title: "쿠팡·스마트스토어 AI 리뷰 분석 툴",
    description:
      "쿠팡·스마트스토어 리뷰 CSV를 업로드하면 AI가 감성 분류, 부정 키워드 추출, 상세페이지 개선 문구와 FAQ 제안까지 한 번에 정리합니다.",
    primaryKeyword: "AI 리뷰 분석",
    canonicalPath: "/",
    updatedAt: "2026-03-31",
    schema: ["softwareApplication"],
    indexable: true,
    breadcrumbs: [HOME_BREADCRUMB]
  },
  {
    section: "features",
    slug: "features",
    title: "리뷰 운영 기능 모음",
    description:
      "AI 리뷰 분석, 리뷰 CSV 추출, 부정리뷰 대응, FAQ 생성까지 ReviewBoost의 핵심 기능을 한곳에서 비교하고 바로 시작할 수 있습니다.",
    primaryKeyword: "리뷰 분석 툴",
    canonicalPath: "/features",
    updatedAt: "2026-03-31",
    schema: ["collectionPage"],
    indexable: true,
    breadcrumbs: breadcrumbs({ label: "기능", path: "/features" })
  },
  {
    section: "features",
    slug: "ai-review-analysis",
    title: "AI 리뷰 분석 기능",
    description:
      "리뷰 CSV를 업로드하면 감성 분류, 카테고리 분류, 부정 키워드 추출과 우선순위 점수를 자동으로 계산하는 ReviewBoost AI 리뷰 분석 기능을 소개합니다.",
    primaryKeyword: "쿠팡 리뷰 분석",
    canonicalPath: "/features/ai-review-analysis",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "기능", path: "/features" },
      { label: "AI 리뷰 분석", path: "/features/ai-review-analysis" }
    )
  },
  {
    section: "features",
    slug: "review-csv-export",
    title: "리뷰 CSV 추출 기능",
    description:
      "쿠팡과 스마트스토어 상품 URL에서 리뷰 CSV를 손쉽게 확보하고 분석 단계로 바로 연결하는 ReviewBoost 리뷰 CSV 추출 기능 안내입니다.",
    primaryKeyword: "쿠팡 리뷰 CSV 추출",
    canonicalPath: "/features/review-csv-export",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "기능", path: "/features" },
      { label: "리뷰 CSV 추출", path: "/features/review-csv-export" }
    )
  },
  {
    section: "features",
    slug: "negative-review-response",
    title: "부정리뷰 대응 기능",
    description:
      "부정 키워드와 카테고리 분포를 바탕으로 우선순위를 잡고 상세페이지 문구와 CS 템플릿까지 제안하는 ReviewBoost 부정리뷰 대응 기능입니다.",
    primaryKeyword: "쿠팡 부정리뷰 대응",
    canonicalPath: "/features/negative-review-response",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "기능", path: "/features" },
      { label: "부정리뷰 대응", path: "/features/negative-review-response" }
    )
  },
  {
    section: "features",
    slug: "review-faq-generator",
    title: "리뷰 FAQ 생성 기능",
    description:
      "리뷰와 문의 패턴에서 반복 질문을 찾아 상세페이지 FAQ와 CS 매뉴얼 초안까지 빠르게 만드는 ReviewBoost FAQ 생성 기능을 설명합니다.",
    primaryKeyword: "리뷰 기반 FAQ",
    canonicalPath: "/features/review-faq-generator",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "기능", path: "/features" },
      { label: "리뷰 FAQ 생성", path: "/features/review-faq-generator" }
    )
  },
  {
    section: "pricing",
    slug: "pricing",
    title: "AI 리뷰 분석 요금제 비교",
    description:
      "무료·Basic·Pro 플랜을 비교하고 리뷰 분석 횟수, 저장 기능, PDF 리포트, 대량 분석 지원 범위를 확인하세요.",
    primaryKeyword: "리뷰 분석 툴",
    canonicalPath: "/pricing",
    updatedAt: "2026-03-31",
    schema: ["offerCatalog"],
    indexable: true,
    breadcrumbs: breadcrumbs({ label: "가격", path: "/pricing" })
  },
  {
    section: "help",
    slug: "help",
    title: "리뷰 분석 사용법 허브",
    description:
      "CSV 준비, 쿠팡 리뷰 CSV 추출, 스마트스토어 리뷰 관리, FAQ 활용까지 ReviewBoost 사용법을 단계별 가이드로 정리했습니다.",
    primaryKeyword: "스마트스토어 리뷰 관리",
    canonicalPath: "/help",
    updatedAt: "2026-03-31",
    schema: ["collectionPage"],
    indexable: true,
    breadcrumbs: breadcrumbs({ label: "사용법", path: "/help" })
  },
  {
    section: "help",
    slug: "csv-checklist",
    title: "CSV 업로드 체크리스트",
    description:
      "ReviewBoost에 리뷰 CSV를 올리기 전에 파일 형식, 필수 컬럼, 인코딩, 업로드 후 확인 포인트를 빠르게 점검하세요.",
    primaryKeyword: "리뷰 CSV 분석",
    canonicalPath: "/help/csv-checklist",
    updatedAt: "2026-03-31",
    schema: ["article"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "사용법", path: "/help" },
      { label: "CSV 업로드 체크리스트", path: "/help/csv-checklist" }
    )
  },
  {
    section: "help",
    slug: "coupang-review-csv-export",
    title: "쿠팡 리뷰 CSV 추출 가이드",
    description:
      "쿠팡 리뷰 CSV를 추출하고 ReviewBoost에서 바로 분석하는 흐름을 단계별로 설명하는 실전 가이드입니다.",
    primaryKeyword: "쿠팡 리뷰 CSV 추출",
    canonicalPath: "/help/coupang-review-csv-export",
    updatedAt: "2026-03-31",
    schema: ["article"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "사용법", path: "/help" },
      { label: "쿠팡 리뷰 CSV 추출", path: "/help/coupang-review-csv-export" }
    )
  },
  {
    section: "help",
    slug: "smartstore-review-csv-export",
    title: "스마트스토어 리뷰 CSV 추출 가이드",
    description:
      "스마트스토어 리뷰 데이터를 내려받고 ReviewBoost로 감성 분석과 FAQ 생성까지 연결하는 사용 가이드입니다.",
    primaryKeyword: "스마트스토어 리뷰 CSV 추출",
    canonicalPath: "/help/smartstore-review-csv-export",
    updatedAt: "2026-03-31",
    schema: ["article"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "사용법", path: "/help" },
      { label: "스마트스토어 리뷰 CSV 추출", path: "/help/smartstore-review-csv-export" }
    )
  },
  {
    section: "help",
    slug: "faq",
    title: "리뷰 FAQ 운영 가이드",
    description:
      "리뷰와 문의 데이터를 기반으로 상세페이지 FAQ, CS 답변, 구매 전 안내 문구를 만드는 ReviewBoost FAQ 운영 가이드입니다.",
    primaryKeyword: "리뷰 기반 FAQ",
    canonicalPath: "/help/faq",
    updatedAt: "2026-03-31",
    schema: ["article"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "사용법", path: "/help" },
      { label: "리뷰 FAQ 운영", path: "/help/faq" }
    )
  },
  {
    section: "blog",
    slug: "blog",
    title: "이커머스 셀러 블로그",
    description:
      "쿠팡 리뷰 분석, 부정리뷰 대응, 스마트스토어 리뷰 관리, 매출 개선 전략을 다루는 ReviewBoost 블로그입니다.",
    primaryKeyword: "이커머스 리뷰 분석",
    canonicalPath: "/blog",
    updatedAt: "2026-03-31",
    schema: ["collectionPage"],
    indexable: true,
    breadcrumbs: breadcrumbs({ label: "블로그", path: "/blog" })
  },
  {
    section: "tools",
    slug: "coupang-csv",
    title: "쿠팡·스마트스토어 리뷰 CSV 도구",
    description:
      "상품 URL을 입력해 리뷰 CSV를 확보하고 바로 분석까지 이어지는 ReviewBoost 리뷰 CSV 다운로드 도구를 사용해보세요.",
    primaryKeyword: "쿠팡 리뷰 CSV 추출",
    canonicalPath: "/coupang-csv",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: true,
    breadcrumbs: breadcrumbs({ label: "리뷰 CSV", path: "/coupang-csv" })
  },
  {
    section: "legal",
    slug: "privacy",
    title: "개인정보처리방침",
    description: "ReviewBoost 개인정보처리방침입니다. 수집 항목, 보관 기간, 처리 목적과 문의처를 확인할 수 있습니다.",
    primaryKeyword: "개인정보처리방침",
    canonicalPath: "/privacy",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: true,
    breadcrumbs: breadcrumbs({ label: "개인정보처리방침", path: "/privacy" })
  },
  {
    section: "legal",
    slug: "terms",
    title: "서비스 이용약관",
    description: "ReviewBoost 서비스 이용약관입니다. 서비스 이용 조건, 구독 및 환불 정책, 책임 제한 조항을 확인하세요.",
    primaryKeyword: "서비스 이용약관",
    canonicalPath: "/terms",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: true,
    breadcrumbs: breadcrumbs({ label: "서비스 이용약관", path: "/terms" })
  }
];

const blogRecordMetaBySlug: Record<string, BlogRecordMeta> = {
  "coupang-review-analysis": {
    updatedAt: "2026-03-31",
    primaryKeyword: "쿠팡 리뷰 분석"
  },
  "coupang-negative-review-response": {
    updatedAt: "2026-03-31",
    primaryKeyword: "쿠팡 부정리뷰 대응"
  },
  "smartstore-review-management": {
    updatedAt: "2026-03-31",
    primaryKeyword: "스마트스토어 리뷰 관리"
  },
  "coupang-rating-drop-reasons": {
    updatedAt: "2026-03-31",
    primaryKeyword: "쿠팡 별점 낮아지는 이유"
  },
  "coupang-review-csv-export": {
    updatedAt: "2026-03-31",
    primaryKeyword: "쿠팡 리뷰 CSV 추출"
  },
  "increase-coupang-sales-with-reviews": {
    updatedAt: "2026-03-31",
    primaryKeyword: "쿠팡 매출 올리는 법"
  },
  "improve-detail-page-with-review-data": {
    updatedAt: "2026-06-30",
    primaryKeyword: "상세페이지 개선 리뷰 데이터"
  },
  "review-negative-keyword-extraction": {
    updatedAt: "2026-07-01",
    primaryKeyword: "리뷰 부정 키워드 추출"
  }
};

const blogRecords: SeoPageRecord[] = blogPosts.map((post) => {
  const meta = blogRecordMetaBySlug[post.slug] ?? {
    updatedAt: "2026-03-31",
    primaryKeyword: post.tag
  };

  return {
    section: "blog",
    slug: post.slug,
    title: post.title,
    description: post.summary,
    primaryKeyword: meta.primaryKeyword,
    canonicalPath: `/blog/${post.slug}`,
    updatedAt: meta.updatedAt,
    schema: ["article"],
    indexable: true,
    breadcrumbs: breadcrumbs(
      { label: "블로그", path: "/blog" },
      { label: post.title, path: `/blog/${post.slug}` }
    )
  };
});

const hiddenRecords: SeoPageRecord[] = [
  {
    section: "auth",
    slug: "login",
    title: "로그인",
    description: "ReviewBoost에 로그인하여 저장된 리포트와 구독 상태를 관리합니다.",
    primaryKeyword: "로그인",
    canonicalPath: "/login",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: false,
    breadcrumbs: breadcrumbs({ label: "로그인", path: "/login" })
  },
  {
    section: "auth",
    slug: "signup",
    title: "회원가입",
    description: "ReviewBoost 무료 회원가입 페이지입니다. 저장된 리포트와 플랜 기능을 사용하려면 가입하세요.",
    primaryKeyword: "회원가입",
    canonicalPath: "/signup",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: false,
    breadcrumbs: breadcrumbs({ label: "회원가입", path: "/signup" })
  },
  {
    section: "auth",
    slug: "forgot-password",
    title: "비밀번호 찾기",
    description: "ReviewBoost 계정의 비밀번호를 재설정하는 페이지입니다.",
    primaryKeyword: "비밀번호 찾기",
    canonicalPath: "/forgot-password",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: false,
    breadcrumbs: breadcrumbs({ label: "비밀번호 찾기", path: "/forgot-password" })
  },
  {
    section: "auth",
    slug: "reset-password",
    title: "비밀번호 재설정",
    description: "ReviewBoost 계정의 새 비밀번호를 설정하는 페이지입니다.",
    primaryKeyword: "비밀번호 재설정",
    canonicalPath: "/reset-password",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: false,
    breadcrumbs: breadcrumbs({ label: "비밀번호 재설정", path: "/reset-password" })
  },
  {
    section: "workspace",
    slug: "dashboard",
    title: "리뷰 분석 워크스페이스",
    description: "리뷰 CSV를 업로드하고 분석 결과를 확인하는 ReviewBoost 워크스페이스입니다.",
    primaryKeyword: "리뷰 분석 워크스페이스",
    canonicalPath: "/dashboard",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: false,
    breadcrumbs: breadcrumbs({ label: "워크스페이스", path: "/dashboard" })
  },
  {
    section: "workspace",
    slug: "dashboard-history",
    title: "저장된 리포트",
    description: "ReviewBoost에 저장된 분석 리포트를 확인하는 페이지입니다.",
    primaryKeyword: "저장된 리포트",
    canonicalPath: "/dashboard/history",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: false,
    breadcrumbs: breadcrumbs({ label: "저장된 리포트", path: "/dashboard/history" })
  },
  {
    section: "workspace",
    slug: "dashboard-analysis",
    title: "분석 상세",
    description: "저장된 분석 리포트 상세 페이지입니다.",
    primaryKeyword: "분석 상세",
    canonicalPath: "/dashboard/analysis/[id]",
    updatedAt: "2026-03-31",
    schema: ["webPage"],
    indexable: false,
    breadcrumbs: breadcrumbs({ label: "분석 상세", path: "/dashboard/analysis/[id]" })
  }
];

export const seoPageRecords = [...publicRecords, ...blogRecords, ...hiddenRecords];

const pageRecordByPath = new Map(seoPageRecords.map((record) => [record.canonicalPath, record]));

export function getSeoPageRecordByPath(path: string) {
  return pageRecordByPath.get(path);
}

export function getRequiredSeoPageRecord(path: string): SeoPageRecord {
  const record = getSeoPageRecordByPath(path);
  if (!record) {
    throw new Error(`Missing SEO record for ${path}`);
  }

  return record;
}

export function matchSeoPageRecord(path: string) {
  return (
    pageRecordByPath.get(path) ??
    (path.startsWith("/dashboard/analysis/") ? pageRecordByPath.get("/dashboard/analysis/[id]") : undefined)
  );
}

export function getIndexableSeoRecords() {
  return seoPageRecords.filter((record) => record.indexable);
}

export function getSeoRecordsForSitemap(section: "core" | "help" | "blog") {
  return getIndexableSeoRecords().filter((record) => {
    if (section === "help") return record.section === "help";
    if (section === "blog") return record.section === "blog";
    return record.section !== "help" && record.section !== "blog";
  });
}

export function getLandingPageGroup(path: string) {
  const record = matchSeoPageRecord(path);
  if (!record) return "other";

  switch (record.section) {
    case "home":
      return "home";
    case "features":
      return "features";
    case "help":
      return "help";
    case "blog":
      return "blog";
    case "pricing":
      return "pricing";
    case "tools":
      return "tools";
    default:
      return record.section;
  }
}

export function getContentGroup(path: string) {
  const record = matchSeoPageRecord(path);
  if (!record) return "other";

  switch (record.section) {
    case "home":
      return "home";
    case "features":
      return path === "/features" ? "feature-hub" : "feature-detail";
    case "help":
      return path === "/help" ? "help-hub" : "help-guide";
    case "blog":
      return path === "/blog" ? "blog-hub" : "blog-article";
    case "pricing":
      return "pricing";
    case "tools":
      return "workflow-tool";
    case "legal":
      return "legal";
    default:
      return record.section;
  }
}
