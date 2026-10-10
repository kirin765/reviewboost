import type { Metadata } from "next";
import { MarketingArticlePage } from "@/components/marketing/MarketingPages";
import StructuredData from "@/components/seo/StructuredData";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createArticleStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/help/oliveyoung-review-csv-export");
export const metadata: Metadata = generatePageMetadata(record, { openGraphType: "article", publishedTime: record.updatedAt });

export default function OliveYoungReviewGuide() {
  return <><StructuredData data={createArticleStructuredData(record)} /><MarketingArticlePage
    eyebrow="리뷰 다운로드 가이드"
    title="올리브영 리뷰 CSV·엑셀 다운로드 방법"
    lead="ReviewBoost 리뷰 수집기 1.5.2 이상에서 올리브영 PC 상품 페이지의 리뷰를 수집하고 CSV 또는 엑셀 파일로 저장할 수 있습니다."
    sections={[
      { title: "1. 확장 프로그램 버전을 확인합니다", paragraphs: ["Chrome, Edge, Whale 또는 Firefox 스토어에서 ReviewBoost 리뷰 수집기를 설치합니다. 이미 설치했다면 브라우저의 확장 프로그램 관리 화면에서 버전이 1.5.2 이상인지 확인하세요. 스토어 심사와 자동 업데이트 시점에 따라 새 버전 제공 시점은 다를 수 있습니다."] },
      { title: "2. 올리브영 PC 상품 페이지를 엽니다", paragraphs: ["www.oliveyoung.co.kr에서 원하는 상품의 상세 페이지로 이동합니다. 주소에 /store/goods/getGoodsDetail.do와 goodsNo 상품 번호가 포함된 PC 상품 페이지를 지원합니다. 모바일 상품 페이지는 지원 대상이 아닙니다."] },
      { title: "3. 리뷰를 수집하고 파일로 저장합니다", ordered: ["브라우저 툴바의 ReviewBoost 아이콘을 누릅니다.", "계정을 연결하고 수집할 리뷰 수를 선택한 뒤 수집을 시작합니다.", "수집이 완료되면 CSV 또는 엑셀 다운로드를 선택합니다."], paragraphs: ["무료 계정은 하루 50개까지 수집할 수 있습니다. 한 번의 수집은 최대 2,000개입니다. 실제 수집 수는 공개 리뷰 수와 사이트 접근 상태에 따라 달라집니다."] },
      { title: "4. 저장된 리뷰와 수집 범위를 확인합니다", bullets: ["리뷰 본문과 별점", "작성일과 작성자 닉네임", "도움이 돼요 수와 리뷰 이미지 URL(제공되는 경우)"], paragraphs: ["이미지는 URL로 저장됩니다. 이미지 파일 자체를 내려받지는 않습니다. 올리브영이 상품 페이지에 연결해 보여주는 연관 상품 리뷰가 함께 포함될 수 있으므로 분석 전에 파일의 리뷰 범위를 확인하세요."] },
      { title: "올리브영 지원이 표시되지 않거나 수집이 멈추나요?", paragraphs: ["확장 프로그램이 1.5.2 이상인지, 올리브영 PC 상품 페이지를 열었는지 확인한 뒤 페이지를 새로고침하세요. 로그인 요청이나 접근 제한이 표시되면 사이트에서 안내하는 절차를 먼저 완료합니다. 사이트 변경이나 접근 제한이 지속되면 수집이 일시적으로 불가능할 수 있습니다."] }
    ]}
    relatedLinks={[{ href: "/extension", title: "11개 지원 사이트와 브라우저별 설치", description: "올리브영 외 지원 쇼핑몰과 수집 한도를 확인하세요." }, { href: "/help/csv-checklist", title: "분석 전 CSV 확인 사항", description: "저장된 리뷰 파일의 컬럼과 내용을 확인하세요." }]}
  /></>;
}
