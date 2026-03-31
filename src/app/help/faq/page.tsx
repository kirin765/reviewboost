import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createArticleStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/help/faq");

export const metadata: Metadata = generatePageMetadata(record, {
  openGraphType: "article",
  publishedTime: record.updatedAt
});

export default function HelpFaqPage() {
  return (
    <>
      <StructuredData data={createArticleStructuredData(record)} />
      <MarketingArticlePage
        eyebrow="Guide"
        title="리뷰 FAQ 운영 가이드"
        lead="리뷰와 문의 데이터를 FAQ, 상세페이지 안내 문구, CS 답변 템플릿으로 바꾸면 구매 전 이탈과 반복 문의를 함께 줄일 수 있습니다."
        sections={[
          {
            title: "FAQ는 검색용 장치보다 구매 전 불안을 줄이는 장치입니다",
            paragraphs: [
              "고객은 구매 전에 가장 불안한 질문을 먼저 확인합니다. 배송 기간, 사이즈, 사용 방법, 교환 가능 여부처럼 반복되는 질문이 명확하게 정리되어야 이탈이 줄어듭니다."
            ]
          },
          {
            title: "리뷰에서 FAQ 후보를 찾는 순서",
            ordered: [
              "리뷰와 문의에서 반복 표현을 모읍니다.",
              "부정 키워드와 함께 질문 패턴을 묶습니다.",
              "상세페이지에서 빠진 설명이 무엇인지 확인합니다.",
              "FAQ와 CS 답변 초안으로 정리합니다."
            ]
          },
          {
            title: "FAQ를 적용할 위치",
            bullets: [
              "상세페이지 하단 FAQ 블록",
              "스토어 Q&A 고정 답변",
              "CS 팀 공용 답변 문서",
              "광고 유입 랜딩 페이지"
            ]
          }
        ]}
        faq={[
          {
            question: "FAQ는 몇 개 정도부터 시작하면 좋나요?",
            answer: "처음에는 반복 빈도가 가장 높은 5개 질문만 정리해도 충분합니다. 이후 문의량과 리뷰 변화를 보며 확장하면 됩니다."
          },
          {
            question: "FAQ만으로 전환율이 개선되나요?",
            answer: "FAQ 단독 효과보다 상세페이지와 CS 답변 일관성이 같이 맞춰질 때 효과가 큽니다. ReviewBoost는 이 세 영역을 함께 정리하는 데 초점을 둡니다."
          }
        ]}
        relatedLinks={[
          {
            href: "/features/review-faq-generator",
            title: "리뷰 FAQ 생성 기능",
            description: "ReviewBoost가 FAQ 초안을 어떻게 만드는지 기능 관점에서 볼 수 있습니다.",
            tag: "기능"
          },
          {
            href: "/blog/increase-coupang-sales-with-reviews",
            title: "리뷰 데이터 활용 전략",
            description: "FAQ가 매출 개선 흐름과 어떻게 연결되는지 사례 중심으로 설명합니다.",
            tag: "블로그"
          }
        ]}
      />
    </>
  );
}
