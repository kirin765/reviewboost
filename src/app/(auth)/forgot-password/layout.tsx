import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "비밀번호 찾기",
  description: "ReviewBoost 비밀번호를 재설정하세요.",
  robots: { index: false, follow: false }
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
