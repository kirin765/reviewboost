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
        collectionGuide
        eyebrow="Guide"
        title="스마트스토어 리뷰 CSV 추출 가이드"
        lead="ReviewBoost 리뷰 수집기를 설치하고 스마트스토어 또는 네이버 브랜드스토어 상품 상세 페이지에서 리뷰를 엑셀·CSV로 저장하세요. 내려받은 CSV는 ReviewBoost AI 분석에 사용할 수 있습니다."
        sections={[
          {
            title: "1. 스마트스토어·브랜드스토어 상품 페이지에서 수집합니다",
            ordered: [
              "아래 확장 프로그램 안내에서 Chrome 웹 스토어로 이동해 ReviewBoost 리뷰 수집기를 설치합니다.",
              "smartstore.naver.com 또는 brand.naver.com의 상품 상세 페이지를 열고 리뷰 영역을 확인합니다.",
              "확장 프로그램에서 수집할 개수를 정한 뒤 ‘리뷰 수집’을 누릅니다.",
              "수집 완료 후 엑셀(.xlsx) 또는 CSV로 내려받습니다. 무료는 하루 50개이며 쇼핑몰의 공개 범위와 접근 제한이 적용됩니다."
            ]
          },
          {
            title: "2. 분석용 컬럼을 확인합니다",
            paragraphs: [
              "스마트스토어 파일은 컬럼명이 매번 조금씩 다를 수 있습니다. 리뷰 본문과 별점만 있으면 분석은 가능합니다."
            ],
            bullets: ["리뷰 내용", "별점", "작성일", "상품 옵션(제공되는 경우)"]
          },
          {
            title: "3. 선택: ReviewBoost에서 반복 질문까지 확인합니다",
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
            href: "/extension",
            title: "리뷰 수집 확장 프로그램 설치·사용법",
            description: "스마트스토어·브랜드스토어 지원과 무료 한도, 설치 방법을 확인하세요.",
            tag: "확장 프로그램"
          },
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
