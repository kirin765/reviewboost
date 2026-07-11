import "./globals.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
import AssistantAttributionEvents from "@/components/AssistantAttributionEvents";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsQueryEvents from "@/components/AnalyticsQueryEvents";
import ErrorBoundary from "@/components/ErrorBoundary";
import AppShell from "@/components/AppShell";
import StructuredData from "@/components/seo/StructuredData";
import { I18nProvider } from "@/lib/i18n";
import { paddleBrowserEnv, paddleBrowserToken } from "@/lib/paddle";
import { getBaseUrl } from "@/lib/seo/metadata";
import { createGlobalStructuredData } from "@/lib/seo/structured-data";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  title: {
    default: "ReviewBoost",
    template: "%s | ReviewBoost"
  },
  description: "쿠팡·스마트스토어 셀러를 위한 AI 리뷰 분석 워크스페이스입니다.",
  authors: [{ name: "ReviewBoost" }],
  metadataBase: new URL(baseUrl),
  manifest: "/manifest.json",
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined
  }
};

const paddleToken = paddleBrowserToken();
const paddleEnvForClient = paddleBrowserEnv();
const isVercelDeployment = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  const body = (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
        <link rel="preload" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" as="style" />
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" rel="stylesheet" />
        <meta name="naver-site-verification" content="6ed42f5a7662f6bd1899e5d2e1b009dd82891f92" />
        {paddleToken ? (
          <>
            <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="beforeInteractive" />
            <Script id="paddle-init" strategy="afterInteractive">
              {`if (window.Paddle) { ${paddleEnvForClient === "sandbox" ? 'Paddle.Environment.set("sandbox");' : ""} Paddle.Initialize({ token: ${JSON.stringify(paddleToken)} }); }`}
            </Script>
          </>
        ) : null}
        <StructuredData data={createGlobalStructuredData()} />
      </head>
      <body>
        <ErrorBoundary>
          {isVercelDeployment ? <Analytics /> : null}
          {isVercelDeployment ? <SpeedInsights /> : null}
          <Suspense fallback={null}>
            <GoogleAnalytics />
            <AnalyticsQueryEvents />
            <AssistantAttributionEvents />
          </Suspense>
          <I18nProvider>
            <AppShell>{children}</AppShell>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );

  return clerkKey ? (
    <ClerkProvider
      localization={koKR}
      appearance={{
        variables: {
          colorPrimary: "#5b5cea",
          colorText: "#1f2540",
          colorBackground: "#ffffff",
          borderRadius: "12px"
        }
      }}
    >
      {body}
    </ClerkProvider>
  ) : (
    body
  );
}
