import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import { MarketingHubPage } from "@/components/marketing/MarketingPages";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createCollectionPageStructuredData } from "@/lib/seo/structured-data";

const helpRecord = getRequiredSeoPageRecord("/help");

const helpCards = [
  {
    href: "/help/csv-checklist",
    title: "CSV 업로드 체크리스트",
    description: "파일 형식, 필수 컬럼, 인코딩, 업로드 직후 점검 포인트를 빠르게 확인합니다.",
    tag: "기본"
  },
  {
    href: "/help/coupang-review-csv-export",
    title: "쿠팡 리뷰 CSV 추출 가이드",
    description: "쿠팡 리뷰 데이터를 추출하고 바로 분석으로 넘기는 운영 흐름을 정리했습니다.",
    tag: "쿠팡"
  },
  {
    href: "/help/smartstore-review-csv-export",
    title: "스마트스토어 리뷰 CSV 추출 가이드",
    description: "스마트스토어 리뷰 다운로드부터 FAQ 생성까지 이어지는 흐름을 다룹니다.",
    tag: "스마트스토어"
  },
  {
    href: "/help/faq",
    title: "리뷰 FAQ 운영 가이드",
    description: "리뷰 데이터를 FAQ, 상세페이지 문구, CS 답변 템플릿으로 바꾸는 방법을 설명합니다.",
    tag: "FAQ"
  }
] as const;

export const metadata: Metadata = generatePageMetadata(helpRecord);

export default function HelpPage() {
  return (
    <>
      <StructuredData
        data={createCollectionPageStructuredData(
          helpRecord,
          helpCards.map((card) => ({ name: card.title, path: card.href }))
        )}
      />
      <MarketingHubPage
        eyebrow="Guide"
        title="ReviewBoost 사용법 허브"
        lead="CSV 준비부터 쿠팡·스마트스토어 리뷰 추출, FAQ 활용까지 자주 찾는 운영 가이드를 모았습니다."
        cards={[...helpCards]}
        highlights={["CSV 준비", "쿠팡/스마트스토어", "FAQ 운영", "로그인 없이 체험 가능"]}
        ctaTitle="가이드만 읽고 끝내지 말고 실제 데이터로 확인해보세요."
        ctaLead="샘플 CSV나 실제 리뷰 파일로 바로 테스트할 수 있습니다."
      />
    </>
  );
}
