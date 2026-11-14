import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createArticleStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/help/coupang-review-csv-export");

export const metadata: Metadata = generatePageMetadata(record, {
  openGraphType: "article",
});

export default function HelpCoupangReviewCsvExportPage() {
  return (
    <>
      <StructuredData data={createArticleStructuredData(record)} />
      <MarketingArticlePage
        collectionGuide
        updatedAt={record.updatedAt}
        eyebrow="Guide"
        title={record.title}
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
            title: "2. 엑셀과 CSV 중 필요한 파일을 선택합니다",
            paragraphs: [
              "엑셀(.xlsx)은 스프레드시트에서 바로 열어 정리할 때, CSV는 다른 도구로 가져오거나 ReviewBoost AI 분석에 사용할 때 선택하세요. 파일 다운로드만 이용할 수 있으며 AI 분석은 선택 기능입니다."
            ],
            bullets: [
              "리뷰 본문·별점·작성일 등 쇼핑몰에서 제공하는 정보",
              "작성자 표시·상품 옵션·도움이 됐어요 수는 제공되는 경우 포함",
              "사진·영상은 URL로 저장되며 이미지 파일 자체를 다운로드하지 않음",
              "쇼핑몰이 제공하지 않는 항목은 비어 있을 수 있으므로 파일 확인 필요"
            ]
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
        faq={[
          {
            question: "무료로 얼마나 다운로드할 수 있나요?",
            answer: "무료 이용자는 하루 50개까지 수집할 수 있습니다. 월 4,900원 Extension 플랜은 일일 수집 한도를 해제하며 Basic·Pro에도 포함됩니다. 모든 플랜에서 한 번에 최대 2,000개까지 수집하고 실제 수집량은 공개 리뷰와 쇼핑몰 접근 제한에 따라 달라집니다."
          },
          {
            question: "리뷰가 일부만 수집되거나 수집이 멈추면 어떻게 하나요?",
            answer: "검색 결과가 아닌 상품 상세 페이지에서 리뷰 영역을 열었는지 확인하세요. 로그인 요청이 있으면 쇼핑몰에서 로그인한 뒤 다시 시도하세요. 공개 리뷰 수, 사이트 응답과 화면 변경에 따라 수집량이 줄거나 실패할 수 있습니다. 계속 실패하면 문의 페이지에 상품 URL과 오류 메시지를 남겨주세요."
          }
        ]}
        relatedLinks={[
          { href: "/pricing", title: "무료·유료 수집 한도 비교", description: "일일 수집 한도와 별도 AI 분석 요금제를 확인하세요.", tag: "요금제" },
          { href: "/support", title: "리뷰 수집 오류 문의", description: "상품 URL과 오류 메시지를 함께 보내주세요.", tag: "지원" },
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
