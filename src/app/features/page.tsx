import type { Metadata } from "next";
import { MarketingHubPage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createCollectionPageStructuredData } from "@/lib/seo/structured-data";

const featureRecord = getRequiredSeoPageRecord("/features");

const featureCards = [
  {
    href: "/features/ai-review-analysis",
    title: "AI 리뷰 분석",
    description: "감성·카테고리 분류, 부정 키워드 추출, 우선순위 점수를 한 번에 계산합니다.",
    tag: "핵심"
  },
  {
    href: "/features/review-csv-export",
    title: "리뷰 CSV 추출",
    description: "쿠팡·스마트스토어 리뷰 확보부터 분석 단계 연결까지 작업을 줄입니다.",
    tag: "데이터"
  },
  {
    href: "/features/negative-review-response",
    title: "부정리뷰 대응",
    description: "문제 카테고리별 우선순위를 잡고 상세페이지와 CS 개선안까지 정리합니다.",
    tag: "실행"
  },
  {
    href: "/features/review-faq-generator",
    title: "리뷰 FAQ 생성",
    description: "반복 질문을 FAQ와 답변 템플릿으로 변환해 문의량을 줄입니다.",
    tag: "전환"
  }
] as const;

export const metadata: Metadata = generatePageMetadata(featureRecord);

export default function FeaturesPage() {
  return (
    <>
      <StructuredData
        data={createCollectionPageStructuredData(
          featureRecord,
          featureCards.map((card) => ({ name: card.title, path: card.href }))
        )}
      />
      <MarketingHubPage
        eyebrow="Features"
        title="리뷰 운영을 실행으로 연결하는 핵심 기능"
        lead="리뷰 데이터를 읽는 데서 끝나지 않고, 우선순위와 개선 액션까지 이어지도록 설계된 ReviewBoost 기능을 소개합니다."
        cards={[...featureCards]}
        highlights={["AI 분석", "CSV 확보", "부정리뷰 대응", "FAQ 생성"]}
        ctaTitle="기능 설명만 보지 말고 실제 데이터로 바로 확인해보세요."
        ctaLead="샘플 CSV로 각 기능이 어떤 결과를 내는지 몇 분 안에 확인할 수 있습니다."
      />
    </>
  );
}
