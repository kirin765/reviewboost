import "./globals.css";
import type { Metadata } from "next";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { signOutAction } from "@/app/(auth)/actions";

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
        <div className="container">
          <div className="header">
            <div className="brand">
              <strong>ReviewBoost</strong>
              <span>리뷰 기반 매출 개선 리포트 MVP</span>
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <a className="btn" href="/help">
                사용법
              </a>
              <a className="btn" href="/pricing">
                요금제
              </a>
              <a className="btn" href="/dashboard">
                분석하기
              </a>
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
              ) : supabaseConfigured ? (
                <a className="btn" href="/login">
                  로그인(선택)
                </a>
              ) : null}
            </div>
          </div>
          {children}
        </div>
      </body>
    </html>
  );
}
