import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/features/review-faq-generator");

export const metadata: Metadata = generatePageMetadata(record);

export default function ReviewFaqGeneratorFeaturePage() {
  return (
    <>
      <StructuredData data={createWebPageStructuredData(record)} />
      <MarketingArticlePage
        eyebrow="Feature"
        title="리뷰 FAQ 생성 기능"
        lead="리뷰에는 구매 전 망설임과 반복 문의의 힌트가 이미 들어 있습니다. ReviewBoost는 이 신호를 FAQ와 상세페이지 문구, CS 답변 초안으로 바꿔 운영 시간을 줄입니다."
        sections={[
          {
            title: "반복 질문을 리뷰에서 찾습니다",
            paragraphs: [
              "리뷰와 문의 데이터에는 항상 비슷한 질문이 반복됩니다. 배송 기간, 사이즈, 사용 방법, 재질, 교환 정책처럼 구매 전 불안 요소가 누적됩니다.",
              "ReviewBoost는 이런 패턴을 묶어 FAQ 후보를 빠르게 추출합니다."
            ]
          },
          {
            title: "상세페이지와 CS 답변을 함께 정리합니다",
            bullets: [
              "상세페이지 FAQ 블록 초안",
              "스토어 Q&A에 바로 복붙 가능한 답변 초안",
              "CS 매뉴얼에 넣을 표준 표현 정리"
            ]
          },
          {
            title: "문의량 감소와 전환율 개선에 연결",
            paragraphs: [
              "FAQ는 검색 노출만을 위한 장치가 아니라 구매 전 이탈을 줄이는 장치입니다. 반복 질문이 미리 해소되면 문의량이 줄고 구매 전환도 안정됩니다.",
              "ReviewBoost를 쓰면 FAQ 작성이 막연한 카피 작업이 아니라 리뷰 데이터 기반 운영 작업으로 바뀝니다."
            ]
          }
        ]}
        relatedLinks={[
          {
            href: "/help/faq",
            title: "리뷰 FAQ 운영 가이드",
            description: "FAQ를 어디에 배치하고 어떤 흐름으로 운영할지 자세한 가이드를 확인하세요.",
            tag: "가이드"
          },
          {
            href: "/blog/smartstore-review-management",
            title: "스마트스토어 리뷰 관리 완벽 가이드",
            description: "FAQ 초안이 실제 운영 루틴에서 어떻게 쓰이는지 사례 중심으로 정리했습니다.",
            tag: "블로그"
          }
        ]}
      />
    </>
  );
}
