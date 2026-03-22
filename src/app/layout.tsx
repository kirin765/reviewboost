import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsQueryEvents from "@/components/AnalyticsQueryEvents";
import ErrorBoundary from "@/components/ErrorBoundary";
import LayoutClient from "@/components/LayoutClient";
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
      "쿠팡·스마트스토어 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다.",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "ReviewBoost - AI 리뷰 분석" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "ReviewBoost - AI 리뷰 분석 | 쿠팡 스마트스토어 셀러 도구",
    description:
      "쿠팡·스마트스토어 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다.",
    images: [{ url: "/opengraph-image", alt: "ReviewBoost - AI 리뷰 분석" }]
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
        <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" />
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
          <LayoutClient plan={session.plan} planText={planText} userEmail={session.userEmail}>
            {children}
          </LayoutClient>
        </ErrorBoundary>
      </body>
    </html>
  );
}
