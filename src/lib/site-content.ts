import type { Locale } from "@/lib/i18n/types";

type FlowStep = {
  title: string;
  body: string;
};

type PlanFeature = {
  label: string;
  value: string;
};

type PlanCard = {
  name: string;
  label: string;
  price: string;
  originalPrice?: string;
  meta: string;
  recommended?: boolean;
  features: PlanFeature[];
  cta: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

type HomeContent = {
  hero: {
    eyebrow: string;
    title: string;
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    tertiaryCta: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    lead: string;
    items: Array<{ title: string; body: string }>;
  };
  solution: {
    eyebrow: string;
    title: string;
    lead: string;
    flow: FlowStep[];
  };
  product: {
    eyebrow: string;
    title: string;
    lead: string;
    items: Array<{ title: string; body: string; stat: string }>;
  };
  result: {
    eyebrow: string;
    title: string;
    lead: string;
    metrics: Array<{ label: string; value: string }>;
    categories: Array<{ label: string; share: string; impact: number }>;
    simulations: Array<{ label: string; value: string; delta: string }>;
  };
  pricing: {
    eyebrow: string;
    title: string;
    lead: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: FaqItem[];
  };
  cta: {
    eyebrow: string;
    title: string;
    lead: string;
    primary: string;
    secondary: string;
  };
};

type PricingContent = {
  eyebrow: string;
  title: string;
  lead: string;
  pills: string[];
  noteTitle: string;
  noteLead: string;
  plans: PlanCard[];
};

type SiteContent = {
  home: HomeContent;
  pricing: PricingContent;
};

const ko: SiteContent = {
  home: {
    hero: {
      eyebrow: "AI review intelligence",
      title: "리뷰에서 상품의 문제를 찾아 매출을 개선하세요",
      lead: "AI가 리뷰를 감정과 카테고리로 분석해 가장 먼저 해결할 문제를 보여줍니다.",
      primaryCta: "리뷰 분석",
      secondaryCta: "URL로 CSV 받기",
      tertiaryCta: "무료 회원가입"
    },
    problem: {
      eyebrow: "Problem",
      title: "리뷰가 쌓여도 어떤 문제가 매출을 깎는지 바로 보이지 않습니다.",
      lead: "낮은 별점만 보는 방식으로는 배송 이슈와 품질 이슈, 최근 악화 신호와 장기 누적 신호를 구분하기 어렵습니다.",
      items: [
        {
          title: "문제의 성격이 섞여 있습니다",
          body: "배송, 품질, 사용성 문제가 같은 리뷰 안에 섞여 있어 사람이 빠르게 분류하기 어렵습니다."
        },
        {
          title: "최근 악화 신호를 놓치기 쉽습니다",
          body: "오래된 불만과 최근 급증한 이슈를 같은 무게로 보면 실제 긴급도를 잘못 판단하게 됩니다."
        },
        {
          title: "실행 우선순위가 불명확합니다",
          body: "어떤 카테고리를 먼저 고쳐야 별점과 전환율에 가장 큰 영향을 주는지 바로 연결되지 않습니다."
        }
      ]
    },
    solution: {
      eyebrow: "Solution",
      title: "입력부터 개선까지 하나의 분석 흐름으로 연결합니다.",
      lead: "URL 또는 CSV에서 시작해 리뷰를 수집하고, 감정과 카테고리를 분류하고, 우선순위를 계산해 바로 실행 가능한 액션으로 정리합니다.",
      flow: [
        { title: "URL 입력", body: "쿠팡 또는 스마트스토어 상품 URL을 넣습니다." },
        { title: "리뷰 수집", body: "리뷰 데이터를 CSV 또는 수집 결과로 정리합니다." },
        { title: "AI 분석", body: "감정 분류와 카테고리 분류를 동시에 진행합니다." },
        { title: "문제 도출", body: "부정 비율, 최근성, 영향도를 합쳐 우선순위를 계산합니다." },
        { title: "개선", body: "상세페이지, CS, FAQ에 바로 반영할 액션을 확인합니다." }
      ]
    },
    product: {
      eyebrow: "Product detail",
      title: "분석 결과는 예쁜 대시보드가 아니라 운영 결정을 위한 작업면으로 정리됩니다.",
      lead: "카드 모자이크 대신 상단 지표, 카테고리 탭, 긴급 리뷰와 우선순위 목록, 시뮬레이션과 액션 아이템으로 한 번에 읽히는 구조입니다.",
      items: [
        {
          title: "감정 분석",
          body: "부정 비율과 평균 별점으로 현재 만족도 수준을 빠르게 판단합니다.",
          stat: "Negative rate 33%"
        },
        {
          title: "카테고리 분류",
          body: "배송, 품질, 사용성, CS, 가격, 기타로 문제를 나누어 실제 원인을 파악합니다.",
          stat: "품질 33.3%"
        },
        {
          title: "이슈 우선순위화",
          body: "발생 비중과 영향도를 합쳐 지금 먼저 해결해야 할 항목을 드러냅니다.",
          stat: "Priority 46.7"
        }
      ]
    },
    result: {
      eyebrow: "Result",
      title: "같은 리뷰 데이터도 해석 방식이 달라지면 대응 순서가 달라집니다.",
      lead: "예시 데이터 기준으로 품질 이슈가 가장 큰 비중과 영향도를 차지했고, 일부만 해결해도 평균 별점 개선 폭이 분명하게 나타납니다.",
      metrics: [
        { label: "Negative rate", value: "33%" },
        { label: "Avg rating", value: "3.33 / 5" },
        { label: "Priority score", value: "46.7" },
        { label: "Recent weight", value: "73%" }
      ],
      categories: [
        { label: "배송", share: "20%", impact: 7 },
        { label: "품질", share: "33.3%", impact: 9 },
        { label: "사용성", share: "20%", impact: 7 },
        { label: "CS", share: "0%", impact: 8 },
        { label: "가격", share: "6.7%", impact: 6 },
        { label: "기타", share: "20%", impact: 4 }
      ],
      simulations: [
        { label: "25% fix", value: "3.67", delta: "+0.33" },
        { label: "75% fix", value: "4.67", delta: "+1.33" }
      ]
    },
    pricing: {
      eyebrow: "Pricing",
      title: "무료로 시작하고, 저장과 대량 분석은 필요할 때 확장하세요.",
      lead: "무료 플랜으로 먼저 결과 품질을 확인한 뒤, 운영 빈도에 따라 Basic 또는 Pro로 확장할 수 있습니다."
    },
    faq: {
      eyebrow: "FAQ",
      title: "도입 전에 가장 많이 확인하는 질문",
      items: [
        {
          question: "로그인 없이도 바로 분석할 수 있나요?",
          answer: "가능합니다. 무료 사용자는 업로드 후 바로 분석과 PDF 다운로드를 진행할 수 있습니다."
        },
        {
          question: "리뷰가 많으면 얼마나 걸리나요?",
          answer: "분석은 보통 수십 초 내로 끝나지만, 대량 데이터는 최대 5분까지 걸릴 수 있습니다."
        },
        {
          question: "어떤 문제를 먼저 고칠지 정말 알 수 있나요?",
          answer: "부정 비율, 최근성, 카테고리 비중, 영향도를 합쳐 우선순위 점수와 액션 리스트로 정리합니다."
        }
      ]
    },
    cta: {
      eyebrow: "Start free",
      title: "리뷰를 읽는 시간을 줄이고, 먼저 고쳐야 할 문제부터 바로 확인하세요.",
      lead: "무료로 가입하고 첫 분석을 시작하거나, 상품 URL로 CSV를 바로 받아서 같은 흐름으로 이어갈 수 있습니다.",
      primary: "무료로 시작하기",
      secondary: "URL로 CSV 받기"
    }
  },
  pricing: {
    eyebrow: "Pricing",
    title: "운영 빈도와 저장 필요도에 맞는 플랜",
    lead: "무료로 정확도를 확인하고, 저장/공유/대량 분석이 필요할 때 Basic과 Pro로 확장할 수 있습니다.",
    pills: ["안전한 카드 결제", "저장/공유 기능 연계", "오픈베타 할인 중"],
    noteTitle: "대량 리뷰는 플랜별 처리량에 맞춰 안정적으로 분석됩니다.",
    noteLead: "처리량을 초과하는 경우 일부 리뷰가 샘플링될 수 있으며, 분석 결과의 우선순위 판단에는 최근성과 영향도가 계속 반영됩니다.",
    plans: [
      {
        name: "free",
        label: "Starter",
        price: "₩0",
        meta: "체험용",
        cta: "무료로 시작",
        features: [
          { label: "월 분석 횟수", value: "5회" },
          { label: "리뷰 수", value: "최대 50개" },
          { label: "PDF 리포트", value: "워터마크 포함" },
          { label: "저장 히스토리", value: "최근 3개" },
          { label: "긴급 리뷰", value: "TOP 3" }
        ]
      },
      {
        name: "basic",
        label: "Recommended",
        price: "₩19,000",
        originalPrice: "₩39,000",
        meta: "월 19,000원 · 오픈베타 한정가",
        recommended: true,
        cta: "Basic 시작",
        features: [
          { label: "월 분석 횟수", value: "200회" },
          { label: "리뷰 수", value: "최대 500개" },
          { label: "PDF 리포트", value: "워터마크 제거" },
          { label: "저장 히스토리", value: "최대 500개" },
          { label: "우선순위 매트릭스", value: "상세 요약 포함" }
        ]
      },
      {
        name: "pro",
        label: "Scale",
        price: "₩45,000",
        originalPrice: "₩89,000",
        meta: "월 45,000원 · 오픈베타 한정가",
        cta: "Pro 시작",
        features: [
          { label: "월 분석 횟수", value: "1,000회" },
          { label: "리뷰 수", value: "최대 2,000개" },
          { label: "시뮬레이션", value: "포함" },
          { label: "긍정 키워드", value: "포함" },
          { label: "팀 공유", value: "최대 5명" }
        ]
      }
    ]
  }
};

const en: SiteContent = {
  home: {
    hero: {
      eyebrow: "AI review intelligence",
      title: "Find product problems in reviews and improve revenue",
      lead: "AI analyzes sentiment and issue categories to show what should be fixed first.",
      primaryCta: "Analyze Reviews",
      secondaryCta: "Get CSV by URL",
      tertiaryCta: "Start Free"
    },
    problem: {
      eyebrow: "Problem",
      title: "Even when reviews pile up, the revenue-impacting issue is rarely obvious at a glance.",
      lead: "Looking at star ratings alone makes it hard to separate shipping issues from quality issues, and recent deterioration from long-tail noise.",
      items: [
        {
          title: "Multiple issues are mixed together",
          body: "Shipping, quality, and usability complaints often appear in the same review, making fast manual sorting unreliable."
        },
        {
          title: "Recent signals get buried",
          body: "If old complaints and new spikes are weighted equally, the real urgent issue is easy to miss."
        },
        {
          title: "Execution order stays unclear",
          body: "Teams still need to guess which category to fix first to affect rating and conversion."
        }
      ]
    },
    solution: {
      eyebrow: "Solution",
      title: "Connect input to action in one review-analysis flow.",
      lead: "Start from a URL or CSV, collect reviews, classify sentiment and category, calculate urgency, and turn the output into immediate actions.",
      flow: [
        { title: "Enter URL", body: "Paste a Coupang or Smart Store product URL." },
        { title: "Collect reviews", body: "Prepare review data as CSV or crawler output." },
        { title: "AI analysis", body: "Run sentiment and category classification together." },
        { title: "Extract problems", body: "Combine negative rate, recency, and impact into priority." },
        { title: "Improve", body: "Act on product page, CS, and FAQ recommendations." }
      ]
    },
    product: {
      eyebrow: "Product detail",
      title: "The output is not a flashy dashboard. It is an analytical operating surface for decisions.",
      lead: "Instead of card mosaics, the workspace is organized around top metrics, category tabs, urgent reviews, priority lists, simulations, and action items.",
      items: [
        {
          title: "Sentiment analysis",
          body: "Use negative rate and average rating to understand the current customer experience quickly.",
          stat: "Negative rate 33%"
        },
        {
          title: "Category classification",
          body: "Break issues into shipping, quality, usability, CS, price, and other to reveal the real cause.",
          stat: "Quality 33.3%"
        },
        {
          title: "Issue prioritization",
          body: "Combine frequency and impact to highlight what should be fixed now.",
          stat: "Priority 46.7"
        }
      ]
    },
    result: {
      eyebrow: "Result",
      title: "The same review data leads to different decisions when it is read with structure.",
      lead: "In the sample dataset, quality issues dominate both share and impact, and even partial fixes move the projected rating meaningfully.",
      metrics: [
        { label: "Negative rate", value: "33%" },
        { label: "Avg rating", value: "3.33 / 5" },
        { label: "Priority score", value: "46.7" },
        { label: "Recent weight", value: "73%" }
      ],
      categories: [
        { label: "Shipping", share: "20%", impact: 7 },
        { label: "Quality", share: "33.3%", impact: 9 },
        { label: "Usability", share: "20%", impact: 7 },
        { label: "CS", share: "0%", impact: 8 },
        { label: "Price", share: "6.7%", impact: 6 },
        { label: "Other", share: "20%", impact: 4 }
      ],
      simulations: [
        { label: "25% fix", value: "3.67", delta: "+0.33" },
        { label: "75% fix", value: "4.67", delta: "+1.33" }
      ]
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Start free, then expand when storage and higher volume matter.",
      lead: "Validate the output quality on the free plan first, then move to Basic or Pro as review operations become more frequent."
    },
    faq: {
      eyebrow: "FAQ",
      title: "Questions teams ask before adopting Review Boost",
      items: [
        {
          question: "Can I analyze without logging in?",
          answer: "Yes. Free users can run analysis and download a PDF immediately after upload."
        },
        {
          question: "How long does analysis take?",
          answer: "Most runs finish within seconds, but larger datasets can take up to five minutes."
        },
        {
          question: "Can it really tell me what to fix first?",
          answer: "Yes. It combines negative rate, recency, category share, and impact into a priority score and action list."
        }
      ]
    },
    cta: {
      eyebrow: "Start free",
      title: "Spend less time reading reviews and see the most urgent product issue first.",
      lead: "Start with a free signup or pull a review CSV from a product URL and continue in the same analytical flow.",
      primary: "Start Free",
      secondary: "Get CSV by URL"
    }
  },
  pricing: {
    eyebrow: "Pricing",
    title: "Plans aligned to analysis frequency and storage needs",
    lead: "Validate accuracy for free, then expand into saved reports, sharing, and higher analysis volume with Basic and Pro.",
    pills: ["Secure card billing", "Storage and sharing included", "Open beta discount"],
    noteTitle: "Large review sets are analyzed within plan-specific capacity limits.",
    noteLead: "When volume exceeds the plan limit, some reviews may be sampled, while recency and impact still shape prioritization.",
    plans: [
      {
        name: "free",
        label: "Starter",
        price: "₩0",
        meta: "For evaluation",
        cta: "Start Free",
        features: [
          { label: "Monthly analyses", value: "5" },
          { label: "Reviews per run", value: "Up to 50" },
          { label: "PDF report", value: "With watermark" },
          { label: "Saved history", value: "Recent 3" },
          { label: "Urgent reviews", value: "Top 3" }
        ]
      },
      {
        name: "basic",
        label: "Recommended",
        price: "₩19,000",
        originalPrice: "₩39,000",
        meta: "₩19,000 / month · open beta price",
        recommended: true,
        cta: "Start Basic",
        features: [
          { label: "Monthly analyses", value: "200" },
          { label: "Reviews per run", value: "Up to 500" },
          { label: "PDF report", value: "No watermark" },
          { label: "Saved history", value: "Up to 500" },
          { label: "Priority matrix", value: "Detailed summary" }
        ]
      },
      {
        name: "pro",
        label: "Scale",
        price: "₩45,000",
        originalPrice: "₩89,000",
        meta: "₩45,000 / month · open beta price",
        cta: "Start Pro",
        features: [
          { label: "Monthly analyses", value: "1,000" },
          { label: "Reviews per run", value: "Up to 2,000" },
          { label: "Simulation", value: "Included" },
          { label: "Positive keywords", value: "Included" },
          { label: "Team sharing", value: "Up to 5 seats" }
        ]
      }
    ]
  }
};

export function getSiteContent(locale: Locale): SiteContent {
  return locale === "en" ? en : ko;
}
