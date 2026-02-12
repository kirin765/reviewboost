import "./globals.css";
import type { Metadata } from "next";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import AnalyticsQueryEvents from "@/components/AnalyticsQueryEvents";

export const metadata: Metadata = {
  title: "ReviewBoost MVP",
  description: "리뷰 CSV 업로드 -> 자동 분석/개선 제안 -> PDF 리포트"
};

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
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
      <body>
        <GoogleAnalytics />
        <AnalyticsQueryEvents />
        <div className="container">
          <div className="header">
            <div className="headerLeft">
              <div className="brand">
                <strong>ReviewBoost</strong>
                <span>리뷰 기반 매출 개선 리포트 MVP</span>
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
                {!email && supabaseConfigured ? (
                  <a className="navLink" href="/login">
                    로그인(선택)
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
          <footer className="siteFooter" aria-label="법적 고지">
            <a className="footerLink" href="/term">
              Terms of Service
            </a>
            <span className="footerDot" aria-hidden="true">
              ·
            </span>
            <a className="footerLink" href="/privacy">
              Privacy Policy
            </a>
          </footer>
        </div>
      </body>
    </html>
  );
}
