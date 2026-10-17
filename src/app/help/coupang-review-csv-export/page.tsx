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
        collectionGuide
        eyebrow="Guide"
        title="쿠팡 리뷰 CSV 추출 가이드"
        lead="Chrome에 ReviewBoost 리뷰 수집기를 설치한 뒤 쿠팡 상품 상세 페이지에서 리뷰를 수집하고 엑셀(.xlsx) 또는 CSV로 저장하세요. 무료로 하루 50개까지 수집할 수 있습니다."
        sections={[
          {
            title: "1. 확장 프로그램으로 상품 리뷰를 수집합니다",
            ordered: [
              "아래 리뷰 수집 확장 프로그램 안내에서 Chrome 웹 스토어로 이동해 ReviewBoost 리뷰 수집기를 설치합니다.",
              "쿠팡 상품 상세 페이지를 열고 리뷰 영역이 보이는지 확인합니다.",
              "확장 프로그램을 열어 수집할 개수를 정하고 ‘리뷰 수집’을 누릅니다.",
              "완료 후 CSV 다운로드 또는 엑셀 다운로드를 선택합니다. 수집량은 공개된 리뷰와 쇼핑몰 응답에 따라 달라집니다."
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
            title: "3. 선택: ReviewBoost에 업로드하고 열을 매핑합니다",
            paragraphs: [
              "컬럼명이 제각각이어도 괜찮습니다. 업로드 후 화면에서 리뷰 본문, 별점, 작성일에 해당하는 열만 연결하면 됩니다."
            ]
          },
          {
            title: "4. 선택: 결과를 바로 운영에 적용합니다",
            bullets: [
              "부정 키워드와 카테고리 분포 확인",
              "긴급 대응 리뷰와 우선순위 점수 검토",
              "상세페이지 문구, FAQ, CS 답변 초안 활용"
            ]
          }
        ]}
        relatedLinks={[
          {
            href: "/extension",
            title: "리뷰 수집 확장 프로그램 설치·사용법",
            description: "Chrome 설치 링크와 지원 쇼핑몰, 수집 한도, 오류 해결 방법을 확인하세요.",
            tag: "확장 프로그램"
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
