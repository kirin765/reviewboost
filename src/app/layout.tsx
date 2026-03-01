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

const baseUrl = process.env.APP_BASE_URL || "https://reviewboost.co.kr";

export const metadata: Metadata = {
  title: {
    default: "ReviewBoost - AI 리뷰 분석",
    template: "%s | ReviewBoost",
  },
  description:
    "이커머스 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다.",
  keywords: [
    "리뷰 분석",
    "이커머스",
    "AI 리뷰",
    "감성 분석",
    "리뷰 관리",
    "셀러 도구",
    "CSV 분석",
    "PDF 리포트",
  ],
  authors: [{ name: "ReviewBoost" }],
  metadataBase: new URL(baseUrl),
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "/",
    siteName: "ReviewBoost",
    title: "ReviewBoost - AI 리뷰 분석",
    description:
      "이커머스 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ReviewBoost - AI 리뷰 분석",
    description:
      "이커머스 리뷰 CSV를 업로드하면 AI가 감성/카테고리 분류, 부정 키워드 추출, 개선 제안, PDF 리포트를 자동 생성합니다.",
  },
  manifest: "/manifest.json",
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
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" rel="stylesheet" />
        <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="beforeInteractive" />
        {paddleToken ? (
          <Script id="paddle-init" strategy="afterInteractive">
            {`if (window.Paddle) { ${paddleEnvForClient === "sandbox" ? 'Paddle.Environment.set("sandbox");' : ""} Paddle.Initialize({ token: ${JSON.stringify(paddleToken)} }); }`}
          </Script>
        ) : null}
      </head>
      <body>
        <ErrorBoundary>
        <GoogleAnalytics />
        <AnalyticsQueryEvents />
        <div className="appShell">
          <aside className="leftNav" aria-label="주요 메뉴">
            <div className="leftNavBrand">
              <strong className="leftNavBrandTitle">📊 ReviewBoost</strong>
              <span className="leftNavBrandSub">AI 리뷰 분석 · 우선순위 액션 제안</span>
            </div>
            <nav aria-label="주요 메뉴">
              <ul className="leftNavList">
                <li>
                  <a className="leftNavLink" href="/help">
                    <span className="leftNavIcon">?</span>
                    <span className="leftNavText">사용법</span>
                  </a>
                </li>
                <li>
                  <a className="leftNavLink" href="/pricing">
                    <span className="leftNavIcon">💎</span>
                    <span className="leftNavText">요금제</span>
                  </a>
                </li>
                <li>
                  <a className="leftNavLink" href="/dashboard">
                    <span className="leftNavIcon">⚙</span>
                    <span className="leftNavText">분석하기</span>
                  </a>
                </li>
                {!email ? (
                  <li>
                    <a className="leftNavLink" href="/login">
                      <span className="leftNavIcon">🔐</span>
                      <span className="leftNavText">로그인</span>
                    </a>
                  </li>
                ) : null}
              </ul>
            </nav>

            <div className="leftNavFooter">
              <span className={`leftNavBadge ${plan === "free" ? "badgeWarning" : plan === "basic" ? "badgePrimary" : "badgeSuccess"}`} title={`현재 플랜: ${planText}`}>
                {planText}
              </span>

              {plan !== "pro" ? (
                <a className="leftNavButton" href="/pricing">
                  업그레이드
                </a>
              ) : null}

              {email ? (
                <>
                  <a className="leftNavButton" href="/dashboard/history">
                    저장된 리포트
                  </a>
                  <span className="leftNavTextMuted" title={email}>
                    {email}
                  </span>
                  <form action={signOutAction} className="leftNavForm">
                    <button className="leftNavButton" type="submit">
                      로그아웃
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          </aside>

          <div className="container">
            {children}
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
