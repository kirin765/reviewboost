import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import ExtensionInstallLink from "@/components/extension/ExtensionInstallLink";
import { ShellContainer } from "@/components/ui/Primitives";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createCollectionPageStructuredData } from "@/lib/seo/structured-data";
import { extensionSteps } from "@/lib/extension-content";

const record = getRequiredSeoPageRecord("/help");
export const metadata: Metadata = generatePageMetadata(record);
const guides = [
  { path: "/help/coupang-review-csv-export", name: "쿠팡 리뷰 엑셀·CSV 다운로드", body: "쿠팡 상품 페이지에서 리뷰를 수집하고 파일로 저장하는 방법" },
  { path: "/help/smartstore-review-csv-export", name: "스마트스토어 리뷰 엑셀·CSV 다운로드", body: "스마트스토어·브랜드스토어의 상품 리뷰를 내보내는 방법" },
  { path: "/help/oliveyoung-review-csv-export", name: "올리브영 리뷰 엑셀·CSV 다운로드", body: "올리브영 PC 상품 페이지의 리뷰를 수집하고 저장 범위를 확인하는 방법" },
  { path: "/extension", name: "지원 쇼핑몰과 수집 한도", body: "12개 쇼핑몰 지원 범위, 무료·유료 한도와 오류 해결 방법" }
];
export default function HelpPage() {
  return <main className="pageMain marketingPage py-10">
    <StructuredData data={createCollectionPageStructuredData(record, guides)} />
    <ShellContainer className="space-y-10">
      <section>
        <p className="text-sm text-[var(--rb-accent)]">ReviewBoost 사용 가이드</p>
        <h1 className="mt-4 text-balance text-3xl font-semibold md:text-4xl">상품 리뷰를 엑셀로 저장하는 방법</h1>
        <p className="mt-5 max-w-3xl text-pretty text-lg leading-8 text-[var(--rb-muted-strong)]">확장 프로그램 설치부터 리뷰 파일 다운로드까지. 데스크톱 Chrome에서 시작하고, AI 분석은 필요할 때 선택하세요.</p>
        <div className="mt-6"><ExtensionInstallLink placement="help" /></div>
      </section>
      <section aria-labelledby="steps-heading" className="card p-6 md:p-8">
        <h2 id="steps-heading" className="text-balance text-2xl font-semibold">처음 사용하는 순서</h2>
        <ol className="mt-6 list-decimal space-y-5 pl-5 text-pretty leading-8">{extensionSteps.map(step=><li key={step}>{step}</li>)}</ol>
        <p className="mt-6 text-pretty text-sm leading-7 text-[var(--rb-muted-strong)]">무료는 하루 50개, 월 4,900원 Extension 플랜은 일일 수집 한도가 없습니다. 모든 플랜에서 1회 최대 2,000개까지 수집할 수 있으며 쇼핑몰의 접근 제한이 적용됩니다.</p>
      </section>
      <section aria-label="상품 리뷰 수집 가이드" className="grid gap-5 md:grid-cols-3">{guides.map(guide=><Link key={guide.path} href={guide.path} className="card block p-6"><h2 className="text-balance text-xl font-semibold">{guide.name}</h2><p className="mt-4 text-pretty leading-8 text-[var(--rb-muted-strong)]">{guide.body}</p><span className="mt-4 inline-block text-sm underline">가이드 보기</span></Link>)}</section>
      <section className="border-t border-[var(--rb-border)] pt-8">
        <h2 className="text-balance text-2xl font-semibold">선택: 수집한 리뷰를 AI로 분석하기</h2>
        <p className="mt-4 text-pretty leading-8 text-[var(--rb-muted-strong)]">확장 프로그램의 ‘ReviewBoost로 분석’을 선택하거나, 저장한 파일을 업로드하세요. 분석 이용 한도는 수집 한도와 별도로 적용됩니다.</p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm"><Link href="/help/csv-checklist" className="underline">CSV 업로드 체크리스트</Link><Link href="/help/faq" className="underline">분석 결과로 FAQ 만들기</Link><Link href="/dashboard/analyze" className="underline">파일 업로드·분석하기</Link></div>
      </section>
    </ShellContainer>
  </main>;
}
