import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsQueryEvents from "@/components/AnalyticsQueryEvents";
import ErrorBoundary from "@/components/ErrorBoundary";
import SidebarNav from "@/components/navigation/SidebarNav";
import { planLabel } from "@/lib/plan";
import { getNavigationSessionState } from "@/lib/navigation_session";
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
  const session = await getNavigationSessionState();
  const planText = planLabel(session.plan);

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
              <SidebarNav variant="app" plan={session.plan} userEmail={session.userEmail} />
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
