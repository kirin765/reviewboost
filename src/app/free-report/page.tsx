import { Suspense } from "react";
import type { Metadata } from "next";
import FreeReportClient from "@/components/free-report/FreeReportClient";

export const metadata: Metadata = {
  title: "무료 리뷰 리포트 — 쿠팡 상품 URL로 바로 분석 | ReviewBoost",
  description:
    "쿠팡 상품 URL만 붙여넣으면 부정 키워드 TOP과 개선안을 무료로 분석해 드립니다. 회원가입 없이 바로 확인하세요."
};

export default function FreeReportPage() {
  return (
    <Suspense fallback={<main className="pageMain" style={{ padding: "48px 16px" }} />}>
      <FreeReportClient />
    </Suspense>
  );
}
