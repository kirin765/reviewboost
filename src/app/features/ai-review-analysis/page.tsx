import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/features/ai-review-analysis");

export const metadata: Metadata = generatePageMetadata(record);

export default function AiReviewAnalysisFeaturePage() {
  return (
    <>
      <StructuredData data={createWebPageStructuredData(record)} />
      <MarketingArticlePage
        eyebrow="Feature"
        title="AI 리뷰 분석 기능"
        lead="리뷰 CSV를 업로드하면 감성 분류, 카테고리 분류, 부정 키워드, 우선순위 점수를 자동으로 계산해 어떤 문제를 먼저 고쳐야 하는지 빠르게 보여줍니다."
        sections={[
          {
            title: "감성 분류와 카테고리 분류를 한 번에",
            paragraphs: [
              "ReviewBoost는 리뷰를 긍정·중립·부정으로 나누는 것에서 끝내지 않고 배송, 품질, 가격, 사용성, CS 기준으로 다시 묶어 어떤 운영 이슈가 실제로 쌓이고 있는지 보여줍니다.",
              "셀러가 한 줄씩 읽으며 분류하지 않아도 전체 리뷰 흐름과 문제 영역을 몇 분 안에 파악할 수 있습니다."
            ]
          },
          {
            title: "부정 키워드와 우선순위 점수",
            paragraphs: [
              "부정 키워드는 단순 빈도보다 실행 우선순위를 잡는 데 쓰입니다. ReviewBoost는 리뷰 수, 부정 비율, 최근성 신호를 함께 반영해 우선순위 점수를 계산합니다."
            ],
            bullets: [
              "지금 매출과 별점에 영향을 주는 이슈 파악",
              "상세페이지 수정이 필요한 주제 선별",
              "CS 응대 템플릿이 필요한 문제 영역 확인"
            ]
          },
          {
            title: "실행 가능한 결과물까지 연결",
            paragraphs: [
              "분석 결과는 리포트 숫자로 끝나지 않습니다. 상세페이지 개선 문구, FAQ 초안, CS 답변 템플릿까지 이어져 바로 운영에 적용할 수 있습니다."
            ],
            bullets: [
              "부정 키워드 Top 10",
              "카테고리별 문제 분포",
              "긴급 대응 리뷰 목록",
              "PDF 리포트와 저장된 분석 이력"
            ]
          }
        ]}
        relatedLinks={[
          {
            href: "/features/negative-review-response",
            title: "부정리뷰 대응 기능",
            description: "분석 결과를 어떤 순서로 운영 액션에 연결하는지 확인하세요.",
            tag: "실행"
          },
          {
            href: "/pricing",
            title: "요금제 비교",
            description: "분석 횟수와 저장 기능, 대량 분석 범위를 비교할 수 있습니다.",
            tag: "가격"
          }
        ]}
      />
    </>
  );
}
