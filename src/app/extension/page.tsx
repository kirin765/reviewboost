import type { Metadata } from "next";
import Link from "next/link";
import SupportedSites from "@/components/marketing/SupportedSites";
import StructuredData from "@/components/seo/StructuredData";
import { extensionStores } from "@/lib/supported-sites";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createExtensionStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord("/extension");
export const metadata: Metadata = generatePageMetadata(record);

export default function ExtensionPage() {
  return (
    <main className="pageMain marketingPage">
      <StructuredData data={createExtensionStructuredData(record)} />
      <section className="card contentPageHeader marketingPageHeader">
        <p className="sectionEyebrow">ReviewBoost 리뷰 수집기</p>
        <h1 className="marketingPageTitle text-balance">11개 쇼핑몰 리뷰를 CSV·엑셀로 다운로드</h1>
        <p className="contentPageLead text-pretty">쿠팡, 스마트스토어, 무신사, 올리브영 등에서 상품 리뷰를 수집하고 파일로 저장하세요. 복사와 붙여넣기 없이 리뷰 본문과 별점을 정리할 수 있습니다.</p>
        <div className="actionRow mt-6">{extensionStores.map((store) => <a className="btn btnPrimary" key={store.name} href={store.url}>{store.name}에서 설치</a>)}</div>
      </section>
      <SupportedSites detailed />
      <section className="card marketingSection">
        <h2 className="marketingArticleHeading">리뷰 수집부터 다운로드까지</h2>
        <ol className="marketingArticleList marketingArticleListOrdered">
          <li>사용하는 PC 브라우저의 스토어에서 ReviewBoost 리뷰 수집기를 설치합니다.</li>
          <li>지원 쇼핑몰의 상품 상세 페이지를 엽니다. 로그인이 필요한 사이트는 먼저 로그인합니다.</li>
          <li>브라우저 툴바에서 확장 프로그램을 열고 계정을 연결한 뒤 수집할 리뷰 수를 선택합니다.</li>
          <li>수집이 끝나면 CSV 또는 엑셀로 다운로드합니다.</li>
        </ol>
        <p className="muted">파일에는 리뷰 본문, 별점, 작성일, 작성자 등 사이트에서 제공하는 정보가 담깁니다. 이미지가 있는 리뷰는 이미지 URL을 저장하며 이미지 파일 자체를 다운로드하지 않습니다. 제공되는 항목은 쇼핑몰마다 다릅니다.</p>
      </section>
      <section className="card marketingSection">
        <h2 className="marketingArticleHeading">무료 한도와 수집 범위</h2>
        <p>무료 계정은 하루 50개 리뷰를 수집할 수 있습니다. 확장 프로그램 구독은 월 4,900원이며 일일 수집 한도가 없습니다. 한 번의 수집은 최대 2,000개까지 가능합니다. Basic·Pro 구독에도 확장 프로그램 이용이 포함됩니다.</p>
        <p className="muted mt-4">리뷰가 공개되어 있고 사이트가 접근을 허용하는 범위에서 수집합니다. 로그인 상태, 접근 제한, 사이트 변경이나 리뷰 삭제에 따라 수집 가능한 리뷰 수가 달라질 수 있습니다. 수집과 AI 분석은 별도 기능이며 분석 한도는 이용 플랜을 따릅니다.</p>
        <div className="actionRow mt-4"><Link className="btn btnOutline" href="/pricing">요금제 확인</Link><Link className="btn btnOutline" href="/extension-privacy">확장 프로그램 개인정보 안내</Link></div>
      </section>
    </main>
  );
}
