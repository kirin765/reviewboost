import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsQueryEvents from "@/components/AnalyticsQueryEvents";
import ErrorBoundary from "@/components/ErrorBoundary";
import { planLabel, resolvePlanTierForUser, type PlanTier } from "@/lib/plan";
import { paddleBrowserEnv, paddleBrowserToken } from "@/lib/paddle";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const baseUrl = process.env.APP_BASE_URL || "https://reviewboost.co.kr";

export const metadata: Metadata = {
  title: {
    default: "ReviewBoost - AI 리뷰 분석 | 쿠팡 스마트스토어 리뷰 관리",
    template: "%s | ReviewBoost"
  },
  description:
    "쿠팡·스마트스토어 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다. 부정리뷰 대응과 매출 개선을 한 화면에서.",
  keywords: [
    "리뷰 분석",
    "쿠팡 리뷰 분석",
    "쿠팡 부정리뷰 대응",
    "쿠팡 매출 올리는 법",
    "스마트스토어 리뷰 관리",
    "쿠팡 별점 낮아지는 이유",
    "쿠팡 리뷰 csv 추출",
    "이커머스",
    "AI 리뷰",
    "감성 분석",
    "셀러 도구",
    "CSV 분석",
    "PDF 리포트"
  ],
  authors: [{ name: "ReviewBoost" }],
  metadataBase: new URL(baseUrl),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "ReviewBoost",
    title: "ReviewBoost - AI 리뷰 분석 | 쿠팡 스마트스토어 셀러 도구",
    description:
      "쿠팡·스마트스토어 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다."
  },
  twitter: {
    card: "summary_large_image",
    title: "ReviewBoost - AI 리뷰 분석 | 쿠팡 스마트스토어 셀러 도구",
    description:
      "쿠팡·스마트스토어 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다."
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" }
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined
  }
};

export const dynamic = "force-dynamic";
const paddleToken = paddleBrowserToken();
const paddleEnvForClient = paddleBrowserEnv();

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { supabaseConfigured } = getCapabilitiesBase();
  let email: string | null = null;
  let userId: string | null = null;
  let plan: PlanTier = "free";
  try {
    if (supabaseConfigured) {
      const supabase = await createSupabaseServerComponentClient();
      const { data } = await supabase.auth.getUser();
      email = data.user?.email ?? null;
      userId = data.user?.id ?? null;
      plan = await resolvePlanTierForUser({ userId, email });
    }
  } catch {
    // Supabase env missing: keep header minimal.
  }
  const planText = planLabel(plan);

  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" as="style" />
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" rel="stylesheet" />
        <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="beforeInteractive" />
        {paddleToken ? (
          <Script id="paddle-init" strategy="afterInteractive">
            {`if (window.Paddle) { ${paddleEnvForClient === "sandbox" ? 'Paddle.Environment.set("sandbox");' : ""} Paddle.Initialize({ token: ${JSON.stringify(paddleToken)} }); }`}
          </Script>
        ) : null}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "ReviewBoost",
              applicationCategory: "BusinessApplication",
              operatingSystem: "Web",
              url: baseUrl,
              description: "쿠팡·스마트스토어 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다.",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "KRW",
                description: "무료 플랜 (월 100회 분석)"
              },
              inLanguage: "ko"
            })
          }}
        />
      </head>
      <body>
        <ErrorBoundary>
          <Analytics />
          <SpeedInsights />
          <GoogleAnalytics />
          <AnalyticsQueryEvents />
          <div className="appShell">
            <aside className="leftNav appSidebar" aria-label="주요 메뉴">
              <a className="appSidebarBrand" href="/">
                <span className="appBrandMark" aria-hidden="true">
                  <span className="appBrandMarkDot" />
                  <span className="appBrandMarkLine appBrandMarkLineOne" />
                  <span className="appBrandMarkLine appBrandMarkLineTwo" />
                </span>
                <span className="appBrandText">
                  <strong>ReviewBoost</strong>
                  <small>AI review ops dashboard</small>
                </span>
              </a>

              <div className="appSidebarSection">
                <p className="appSidebarEyebrow">Workspace</p>
                <nav aria-label="주요 메뉴">
                  <ul className="appNavList">
                    <li>
                      <a className="appNavLink" href="/dashboard">
                        <span className="appNavIndex">01</span>
                        <span className="appNavCopy">
                          <strong>분석하기</strong>
                          <small>CSV 업로드와 결과 확인</small>
                        </span>
                      </a>
                    </li>
                    <li>
                      <a className="appNavLink" href="/pricing">
                        <span className="appNavIndex">02</span>
                        <span className="appNavCopy">
                          <strong>요금제</strong>
                          <small>플랜과 기능 비교</small>
                        </span>
                      </a>
                    </li>
                    <li>
                      <a className="appNavLink" href="/help">
                        <span className="appNavIndex">03</span>
                        <span className="appNavCopy">
                          <strong>사용법</strong>
                          <small>업로드와 열 매핑 가이드</small>
                        </span>
                      </a>
                    </li>
                    {!email ? (
                      <li>
                        <a className="appNavLink" href="/login">
                          <span className="appNavIndex">04</span>
                          <span className="appNavCopy">
                            <strong>로그인</strong>
                            <small>저장 기능과 계정 관리</small>
                          </span>
                        </a>
                      </li>
                    ) : null}
                  </ul>
                </nav>
              </div>

              <div className="appSidebarSection appSidebarPlanCard">
                <div className="appSidebarPlanHeader">
                  <span
                    className={`leftNavBadge appPlanBadge ${
                      plan === "free" ? "badgeWarning" : plan === "basic" ? "badgePrimary" : "badgeSuccess"
                    }`}
                    title={`현재 플랜: ${planText}`}
                  >
                    {planText}
                  </span>
                  <span className="appSidebarPlanMeta">{email ? "로그인된 워크스페이스" : "게스트 워크스페이스"}</span>
                </div>
                <p className="appSidebarPlanCopy">
                  리뷰 업로드, 결과 저장, PDF 공유를 현재 플랜과 로그인 상태에 맞춰 운영할 수 있습니다.
                </p>
                <div className="appSidebarActionStack">
                  {plan !== "pro" ? (
                    <a className="leftNavButton appSidebarButton primary" href="/pricing">
                      업그레이드
                    </a>
                  ) : null}
                  <a className="leftNavButton appSidebarButton" href="/dashboard">
                    분석 워크스페이스 열기
                  </a>
                  {email ? (
                    <>
                      <a className="leftNavButton appSidebarButton" href="/dashboard/history">
                        저장된 리포트
                      </a>
                      <span className="appSidebarEmail" title={email}>
                        {email}
                      </span>
                      <form action={signOutAction} className="leftNavForm appSidebarForm">
                        <button className="leftNavButton appSidebarButton" type="submit">
                          로그아웃
                        </button>
                      </form>
                    </>
                  ) : (
                    <a className="leftNavButton appSidebarButton" href="/signup">
                      계정 만들기
                    </a>
                  )}
                </div>
              </div>
            </aside>

            <div className="container appContainer">
              <header className="siteTopbar" aria-label="페이지 상단 요약">
                <div>
                  <p className="siteTopbarEyebrow">Review operations dashboard</p>
                  <p className="siteTopbarTitle">리뷰 데이터를 실행 가능한 인사이트와 팀 액션으로 전환하세요.</p>
                </div>
                <div className="siteTopbarMeta">
                  <span className="siteTopbarPill">{planText}</span>
                  <a className="btn btnPrimary" href="/dashboard">
                    분석 시작
                  </a>
                </div>
              </header>

              <div className="contentStage">{children}</div>

              <footer className="siteFooterV2" aria-label="사이트 정보">
                <div className="footerSection">
                  <h4>ReviewBoost</h4>
                  <ul>
                    <li><a href="/help">사용법</a></li>
                    <li><a href="/pricing">요금제</a></li>
                    <li><a href="/dashboard">분석하기</a></li>
                  </ul>
                </div>
                <div className="footerSection">
                  <h4>법적</h4>
                  <ul>
                    <li><a href="/term">서비스 이용약관</a></li>
                    <li><a href="/privacy">개인정보 처리방침</a></li>
                  </ul>
                </div>
                <div className="footerSection">
                  <h4>고객 지원</h4>
                  <ul>
                    <li><a href="mailto:support@reviewboost.co.kr">support@reviewboost.co.kr</a></li>
                  </ul>
                </div>
              </footer>
            </div>
          </div>
        </ErrorBoundary>
      </body>
    </html>
  );
}
