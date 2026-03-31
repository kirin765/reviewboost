import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createArticleStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/help/coupang-review-csv-export");

export const metadata: Metadata = generatePageMetadata(record, {
  openGraphType: "article",
  publishedTime: record.updatedAt
});

export default function HelpCoupangReviewCsvExportPage() {
  return (
    <>
      <StructuredData data={createArticleStructuredData(record)} />
      <MarketingArticlePage
        eyebrow="Guide"
        title="쿠팡 리뷰 CSV 추출 가이드"
        lead="쿠팡 리뷰 데이터를 CSV로 확보하고 ReviewBoost에서 바로 분석까지 이어지는 흐름을 빠르게 정리했습니다."
        sections={[
          {
            title: "1. 쿠팡 리뷰 데이터를 확보합니다",
            ordered: [
              "쿠팡 판매자 센터 또는 파트너스에서 리뷰 관리 화면으로 이동합니다.",
              "조회 기간과 상품 범위를 선택합니다.",
              "리뷰 다운로드 또는 엑셀 내보내기 기능으로 파일을 저장합니다."
            ]
          },
          {
            title: "2. CSV 형식과 핵심 컬럼을 확인합니다",
            paragraphs: [
              "ReviewBoost 분석에 필요한 최소 정보는 리뷰 본문과 별점입니다. 작성일이 있으면 최근 이슈 추적까지 가능합니다."
            ],
            bullets: ["리뷰 본문", "별점", "작성일", "상품명(선택)"]
          },
          {
            title: "3. ReviewBoost에 업로드하고 열을 매핑합니다",
            paragraphs: [
              "컬럼명이 제각각이어도 괜찮습니다. 업로드 후 화면에서 리뷰 본문, 별점, 작성일에 해당하는 열만 연결하면 됩니다."
            ]
          },
          {
            title: "4. 결과를 바로 운영에 적용합니다",
            bullets: [
              "부정 키워드와 카테고리 분포 확인",
              "긴급 대응 리뷰와 우선순위 점수 검토",
              "상세페이지 문구, FAQ, CS 답변 초안 활용"
            ]
          }
        ]}
        relatedLinks={[
          {
            href: "/coupang-csv",
            title: "리뷰 CSV 도구",
            description: "상품 URL 기반 리뷰 CSV 확보 흐름을 바로 실행할 수 있습니다.",
            tag: "도구"
          },
          {
            href: "/features/review-csv-export",
            title: "리뷰 CSV 추출 기능",
            description: "이 가이드가 어떤 기능 흐름에 연결되는지 설명합니다.",
            tag: "기능"
          }
        ]}
      />
    </>
  );
}
