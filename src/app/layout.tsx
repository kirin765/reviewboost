import "./globals.css";
import type { Metadata } from "next";
import Script from "next/script";
import { getCapabilitiesBase } from "@/lib/capabilities";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsQueryEvents from "@/components/AnalyticsQueryEvents";

export const metadata: Metadata = {
  title: "ReviewBoost",
  description: "리뷰 CSV 업로드 -> 자동 분석/개선 제안 -> PDF 리포트"
};

export const dynamic = "force-dynamic";
const paddleToken = process.env.NEXT_PUBLIC_PADDLE_TOKEN;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { supabaseConfigured } = getCapabilitiesBase();
  let email: string | null = null;
  try {
    if (supabaseConfigured) {
      const supabase = createSupabaseServerComponentClient();
      const { data } = await supabase.auth.getUser();
      email = data.user?.email ?? null;
    }
  } catch {
    // Supabase env missing: keep header minimal.
  }

  return (
    <html lang="ko">
      <head>
        <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css" rel="stylesheet" />
        <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="beforeInteractive" />
        {paddleToken ? (
          <Script id="paddle-init" strategy="afterInteractive">
            {`if (window.Paddle) { Paddle.Environment.set("sandbox"); Paddle.Initialize({ token: ${JSON.stringify(paddleToken)} }); }`}
          </Script>
        ) : null}
      </head>
      <body>
        <GoogleAnalytics />
        <AnalyticsQueryEvents />
        <div className="container">
          <div className="header">
            <div className="headerLeft">
              <div className="brand">
                <strong>📊 ReviewBoost</strong>
              </div>
              <nav className="topNav" aria-label="주요 메뉴">
                <a className="navLink" href="/help">
                  사용법
                </a>
                <a className="navLink" href="/pricing">
                  요금제
                </a>
                <a className="navLink" href="/dashboard">
                  분석하기
                </a>
                {!email ? (
                  <a className="navLink" href="/login">
                    로그인
                  </a>
                ) : null}
              </nav>
            </div>
            <div className="headerRight">
              {email ? (
                <>
                  <a className="btn" href="/dashboard/history">
                    저장된 리포트
                  </a>
                  <span className="pill" title={email}>
                    {email}
                  </span>
                  <form action={signOutAction}>
                    <button className="btn" type="submit">
                      로그아웃
                    </button>
                  </form>
                </>
              ) : null}
            </div>
          </div>
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
      </body>
    </html>
  );
}
