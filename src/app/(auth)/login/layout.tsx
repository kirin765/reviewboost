import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "로그인",
  description: "ReviewBoost에 로그인하여 리뷰 분석을 시작하세요.",
  robots: { index: false, follow: false }
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
