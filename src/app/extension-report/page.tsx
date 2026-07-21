import { Suspense } from "react";
import type { Metadata } from "next";
import ExtensionReportClient from "@/components/extension/ExtensionReportClient";

export const metadata: Metadata = {
  title: "익스텐션 분석 리포트 | ReviewBoost",
  description: "ReviewBoost 리뷰 수집기 익스텐션으로 모은 리뷰의 무료 분석 리포트입니다.",
  robots: { index: false, follow: false }
};

export default function ExtensionReportPage() {
  return (
    <Suspense fallback={<main className="pageMain" style={{ padding: "48px 16px" }} />}>
      <ExtensionReportClient />
    </Suspense>
  );
}
