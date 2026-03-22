import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "회원가입",
  description: "ReviewBoost 무료 회원가입. 월 100회 리뷰 분석을 무료로 시작하세요.",
  robots: { index: false, follow: false }
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
