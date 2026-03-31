import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createWebPageStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/features/negative-review-response");

export const metadata: Metadata = generatePageMetadata(record);

export default function NegativeReviewResponseFeaturePage() {
  return (
    <>
      <StructuredData data={createWebPageStructuredData(record)} />
      <MarketingArticlePage
        eyebrow="Feature"
        title="부정리뷰 대응 기능"
        lead="부정리뷰가 쌓였을 때 무엇부터 고칠지 정하지 못하면 별점과 전환율이 같이 흔들립니다. ReviewBoost는 문제를 분리하고 우선순위를 잡아 실행 순서를 정리합니다."
        sections={[
          {
            title: "문제 카테고리를 먼저 분리합니다",
            paragraphs: [
              "배송 문제인지, 품질 문제인지, 가격과 기대치의 불일치인지가 분명해야 대응 방향이 정해집니다.",
              "ReviewBoost는 부정 리뷰를 카테고리별로 나눠 가장 많은 불만이 어디에 몰려 있는지 한눈에 보여줍니다."
            ]
          },
          {
            title: "상세페이지와 CS를 동시에 고칩니다",
            bullets: [
              "상세페이지에 보강해야 할 정보 선별",
              "반복 불만에 대응하는 CS 답변 초안 정리",
              "FAQ로 전환할 수 있는 질문 패턴 식별"
            ]
          },
          {
            title: "팀 운영 루틴으로 만들 수 있습니다",
            paragraphs: [
              "주간 단위로 리뷰를 다시 분석하면 어떤 이슈가 줄고 있는지, 여전히 반복되는지 비교할 수 있습니다.",
              "이 루틴이 자리 잡으면 부정리뷰 대응이 일회성 작업이 아니라 운영 시스템이 됩니다."
            ]
          }
        ]}
        relatedLinks={[
          {
            href: "/blog/coupang-negative-review-response",
            title: "쿠팡 부정리뷰 대응 블로그",
            description: "카테고리별 대응 전략과 상세페이지 수정 체크리스트를 자세히 확인하세요.",
            tag: "블로그"
          },
          {
            href: "/features/review-faq-generator",
            title: "리뷰 FAQ 생성 기능",
            description: "반복 불만을 FAQ와 사전 안내 문구로 전환하는 흐름을 확인할 수 있습니다.",
            tag: "연계"
          }
        ]}
      />
    </>
  );
}
