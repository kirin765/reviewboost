import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/features/review-csv-export");

export const metadata: Metadata = generatePageMetadata(record);

export default function ReviewCsvExportFeaturePage() {
  return (
    <>
      <StructuredData data={createWebPageStructuredData(record)} />
      <MarketingArticlePage
        eyebrow="Feature"
        title="리뷰 CSV 추출 기능"
        lead="쿠팡과 스마트스토어에서 리뷰 데이터를 확보하는 단계가 막히면 분석 루틴이 끊깁니다. ReviewBoost는 리뷰 CSV 확보에서 분석까지 한 흐름으로 연결하도록 돕습니다."
        sections={[
          {
            title: "리뷰 데이터를 먼저 확보해야 운영이 빨라집니다",
            paragraphs: [
              "실제 셀러 운영에서는 분석보다 CSV 확보가 더 번거로운 경우가 많습니다. 어디서 리뷰를 내려받아야 하는지, 어떤 컬럼을 봐야 하는지 헷갈리면 분석 자체가 지연됩니다.",
              "ReviewBoost는 리뷰 CSV 확보 흐름을 별도 도구와 가이드로 분리해 초반 병목을 줄입니다."
            ]
          },
          {
            title: "쿠팡·스마트스토어 흐름을 함께 지원",
            bullets: [
              "쿠팡 상품 URL 기반 리뷰 CSV 확보",
              "스마트스토어 리뷰 다운로드 가이드 제공",
              "업로드 후 컬럼 자동 추정과 수동 매핑 지원"
            ]
          },
          {
            title: "CSV 확보 후 바로 분석 단계로 이동",
            paragraphs: [
              "데이터를 따로 정리하지 않아도 리뷰 본문, 별점, 작성일만 연결되면 바로 감성 분석과 카테고리 분류를 시작할 수 있습니다.",
              "운영팀은 CSV 확보와 분석을 같은 작업 루틴에 묶어 매주 반복 가능한 리뷰 관리 프로세스를 만들 수 있습니다."
            ]
          }
        ]}
        relatedLinks={[
          {
            href: "/help/coupang-review-csv-export",
            title: "쿠팡 리뷰 CSV 추출 가이드",
            description: "실제 추출 단계와 업로드 흐름을 단계별로 확인하세요.",
            tag: "가이드"
          },
          {
            href: "/coupang-csv",
            title: "리뷰 CSV 도구",
            description: "상품 URL로 리뷰 CSV를 확보하는 실제 도구 화면으로 이동합니다.",
            tag: "도구"
          }
        ]}
      />
    </>
  );
}
