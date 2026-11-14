import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createArticleStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/help/smartstore-review-csv-export");

export const metadata: Metadata = generatePageMetadata(record, {
  openGraphType: "article",
});

export default function HelpSmartstoreReviewCsvExportPage() {
  return (
    <>
      <StructuredData data={createArticleStructuredData(record)} />
      <MarketingArticlePage
        collectionGuide
        updatedAt={record.updatedAt}
        eyebrow="Guide"
        title={record.title}
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
