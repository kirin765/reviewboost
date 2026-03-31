import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createArticleStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/help/smartstore-review-csv-export");

export const metadata: Metadata = generatePageMetadata(record, {
  openGraphType: "article",
  publishedTime: record.updatedAt
});

export default function HelpSmartstoreReviewCsvExportPage() {
  return (
    <>
      <StructuredData data={createArticleStructuredData(record)} />
      <MarketingArticlePage
        eyebrow="Guide"
        title="스마트스토어 리뷰 CSV 추출 가이드"
        lead="스마트스토어 리뷰 데이터를 내려받아 감성 분석, 부정 키워드 파악, FAQ 작성까지 연결하는 기본 흐름을 정리했습니다."
        sections={[
          {
            title: "1. 스마트스토어 리뷰 데이터를 내려받습니다",
            ordered: [
              "스마트스토어 센터에 로그인합니다.",
              "상품 또는 리뷰 관리 메뉴에서 기간을 선택합니다.",
              "리뷰 데이터를 엑셀 또는 CSV로 내려받습니다."
            ]
          },
          {
            title: "2. 분석용 컬럼을 확인합니다",
            paragraphs: [
              "스마트스토어 파일은 컬럼명이 매번 조금씩 다를 수 있습니다. 리뷰 본문과 별점만 있으면 분석은 가능합니다."
            ],
            bullets: ["리뷰 내용", "별점", "작성일", "문의/답변 여부(선택)"]
          },
          {
            title: "3. ReviewBoost에서 반복 질문까지 확인합니다",
            paragraphs: [
              "스마트스토어는 구매 전 질문과 후기의 간격이 짧기 때문에 리뷰에서 FAQ 패턴을 찾는 것이 중요합니다.",
              "분석 결과에서 반복 질문과 부정 키워드를 함께 보면 상세페이지 보완 포인트가 더 선명해집니다."
            ]
          },
          {
            title: "4. 운영 루틴으로 연결합니다",
            bullets: [
              "주간 리뷰 분석",
              "상세페이지 FAQ 업데이트",
              "CS 답변 템플릿 보정",
              "다음 주 개선 우선순위 설정"
            ]
          }
        ]}
        relatedLinks={[
          {
            href: "/blog/smartstore-review-management",
            title: "스마트스토어 리뷰 관리 완벽 가이드",
            description: "주간 운영 루틴과 FAQ 활용 사례를 자세히 확인하세요.",
            tag: "블로그"
          },
          {
            href: "/help/faq",
            title: "리뷰 FAQ 운영 가이드",
            description: "반복 질문을 FAQ로 바꾸는 상세 흐름을 함께 볼 수 있습니다.",
            tag: "FAQ"
          }
        ]}
      />
    </>
  );
}
