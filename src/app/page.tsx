import React, { Suspense } from "react";
import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import HomePageContent from "@/components/home/HomePageContent";
import HomePageStatus from "@/components/home/HomePageStatus";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createFaqStructuredData, createSoftwareApplicationStructuredData } from "@/lib/seo/structured-data";

const homeRecord = getRequiredSeoPageRecord("/");
const homeFaqs = [
  {
    question: "ReviewBoost는 어떤 판매자에게 적합한가요?",
    answer: "쿠팡과 스마트스토어에서 리뷰가 꾸준히 쌓이고, 배송·품질·사용성 문제를 우선순위로 관리해야 하는 셀러 팀에 적합합니다."
  },
  {
    question: "무료로도 리뷰 분석을 시작할 수 있나요?",
    answer: "네. 무료로 바로 분석을 시작할 수 있고, 핵심 요약과 카테고리 분포, 우선순위 흐름을 먼저 확인할 수 있습니다."
  },
  {
    question: "리뷰 분석 결과로 무엇을 얻을 수 있나요?",
    answer: "부정 비율, 평균 별점, 문제 카테고리, 긴급 리뷰, 개선 액션 아이템, 평점 회복 시뮬레이션까지 한 번에 확인할 수 있습니다."
  }
];

export const metadata: Metadata = generatePageMetadata(homeRecord);

export default function HomePage() {
  return (
    <main className="pageMain marketingPage">
      <StructuredData data={createSoftwareApplicationStructuredData(homeRecord)} />
      <StructuredData data={createFaqStructuredData(homeRecord, homeFaqs)} />
      <Suspense fallback={null}>
        <HomePageStatus />
      </Suspense>
      <HomePageContent />
    </main>
  );
}
