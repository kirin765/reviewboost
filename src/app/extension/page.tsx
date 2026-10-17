import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import StructuredData from "@/components/seo/StructuredData";
import { ShellContainer } from "@/components/ui/Primitives";
import { buttonStyles } from "@/components/ui/Button";
import ExtensionInstallLink from "@/components/extension/ExtensionInstallLink";
import { extensionProduct, extensionSteps, extensionFaqs } from "@/lib/extension-content";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createExtensionStructuredData } from "@/lib/seo/structured-data";

const record = getRequiredSeoPageRecord(extensionProduct.path);

export const metadata: Metadata = {
  ...generatePageMetadata(record, { image: "/extension/opengraph-image" }),
  keywords: ["리뷰 수집기", "쿠팡 리뷰 엑셀 다운로드", "스마트스토어 리뷰 CSV 추출", "리뷰 수집 확장 프로그램", "ReviewBoost"]
};

export default function ExtensionPage() {
  return (
    <main className="pageMain marketingPage py-8">
      <StructuredData data={createExtensionStructuredData(record)} />
      <ShellContainer className="space-y-8">
        <nav aria-label="현재 위치" className="text-sm text-[var(--rb-muted-strong)]">
          <Link href="/" className="underline">홈</Link> / <span aria-current="page">리뷰 수집 확장 프로그램</span>
        </nav>
        <section className="card space-y-6 p-6 md:p-10">
          <p className="text-sm font-medium text-[var(--rb-accent)]">{extensionProduct.name}</p>
          <h1 className="text-balance break-keep text-3xl font-semibold leading-tight md:text-5xl">쿠팡·스마트스토어 리뷰를 엑셀·CSV로 저장하세요</h1>
          <p className="max-w-3xl text-pretty text-lg leading-8 text-[var(--rb-muted-strong)]">{extensionProduct.description}</p>
          <div className="flex flex-wrap gap-3">
            <ExtensionInstallLink placement="extension_hero" />
            <a href="#how-to" className={buttonStyles({ variant: "secondary" })}>사용 방법 보기</a>
          </div>
          <p className="text-pretty text-sm text-[var(--rb-muted-strong)]">데스크톱 Chrome에서 설치하세요. ReviewBoost는 지원 쇼핑몰과 제휴한 서비스가 아닙니다.</p>
          <p className="text-sm text-[var(--rb-muted-strong)]">ReviewBoost 제품 안내 · 업데이트 <time dateTime={record.updatedAt}>{record.updatedAt}</time></p>
        </section>

        <section aria-labelledby="features-heading" className="card grid gap-8 p-6 md:p-10 lg:grid-cols-2">
          <div>
            <h2 id="features-heading" className="text-balance text-2xl font-semibold">복사·붙여넣기 없이 리뷰 파일 만들기</h2>
            <ul className="mt-6 list-disc space-y-3 pl-5 text-pretty leading-7">
              {extensionProduct.features.map((feature) => <li key={feature}>{feature}</li>)}
            </ul>
          </div>
          <figure>
            <Image src="/blog-images/reviewboost-extension-export.png" alt="ReviewBoost 리뷰 수집기의 리뷰 수집 결과와 엑셀·CSV 다운로드 화면" width={1280} height={800} sizes="(min-width: 1024px) 50vw, 100vw" className="h-auto w-full rounded-xl border border-[var(--rb-border)]" />
            <figcaption className="mt-3 text-pretty text-sm text-[var(--rb-muted-strong)]">수집한 리뷰를 파일로 저장하거나 선택하여 AI 분석으로 연결합니다.</figcaption>
          </figure>
        </section>

        <section aria-labelledby="platforms-heading" className="card space-y-5 p-6 md:p-10">
          <h2 id="platforms-heading" className="text-balance text-2xl font-semibold">어떤 쇼핑몰의 리뷰를 수집할 수 있나요?</h2>
          <p className="text-pretty leading-7">아래 12개 쇼핑몰의 상품 상세 페이지를 지원합니다. 스마트스토어 지원에는 네이버 브랜드스토어가 포함됩니다.</p>
          <ul className="grid list-disc gap-3 pl-5 sm:grid-cols-2 lg:grid-cols-3">
            {extensionProduct.platforms.map((platform) => <li key={platform}>{platform}</li>)}
          </ul>
          <p className="text-pretty text-sm leading-7 text-[var(--rb-muted-strong)]">리뷰 공개 범위, 로그인 상태, 쇼핑몰의 접근 제한과 화면 변경에 따라 수집 가능 여부가 달라질 수 있습니다.</p>
        </section>

        <section id="how-to" aria-labelledby="how-to-heading" className="card scroll-mt-24 space-y-5 p-6 md:p-10">
          <h2 id="how-to-heading" className="text-balance text-2xl font-semibold">상품 리뷰를 엑셀·CSV로 저장하는 방법</h2>
          <ol className="list-decimal space-y-4 pl-6 text-pretty leading-8">
            {extensionSteps.map((step) => <li key={step}>{step}</li>)}
          </ol>
          <div className="flex flex-wrap gap-4">
            <Link href="/help/coupang-review-csv-export" className="underline">쿠팡 리뷰 추출 가이드</Link>
            <Link href="/help/smartstore-review-csv-export" className="underline">스마트스토어 리뷰 추출 가이드</Link>
          </div>
        </section>

        <section aria-labelledby="pricing-heading" className="card space-y-5 p-6 md:p-10">
          <h2 id="pricing-heading" className="text-balance text-2xl font-semibold">무료 수집 한도와 요금은 어떻게 되나요?</h2>
          <dl className="grid gap-6 sm:grid-cols-2">
            <div><dt className="font-semibold">무료</dt><dd className="mt-2 text-pretty leading-7 tabular-nums">하루 {extensionProduct.freeDailyLimit}개까지 수집</dd></div>
            <div><dt className="font-semibold">Extension 플랜</dt><dd className="mt-2 text-pretty leading-7 tabular-nums">월 {extensionProduct.monthlyPrice.toLocaleString("ko-KR")}원 · 일일 수집 한도 없음<br />Basic·Pro 구독에도 포함</dd></div>
          </dl>
          <p className="text-pretty leading-7 tabular-nums">모든 플랜에서 1회 수집은 최대 {extensionProduct.perCollectionLimit.toLocaleString("ko-KR")}개입니다. 실제 수집량은 공개된 리뷰 수에 따라 달라지며 AI 분석의 이용 한도는 별도로 적용됩니다.</p>
          <Link href="/pricing" className="inline-block underline">분석 요금제와 수집 플랜 비교하기</Link>
        </section>

        <section aria-labelledby="faq-heading" className="card space-y-6 p-6 md:p-10">
          <h2 id="faq-heading" className="text-balance text-2xl font-semibold">리뷰 수집 확장 프로그램 자주 묻는 질문</h2>
          {extensionFaqs.map((faq) => (
            <div key={faq.question} className="border-t border-[var(--rb-border)] pt-5">
              <h3 className="text-balance text-lg font-semibold">{faq.question}</h3>
              <p className="mt-3 text-pretty leading-8 text-[var(--rb-muted-strong)]">{faq.answer}</p>
            </div>
          ))}
          <div className="flex flex-wrap gap-4">
            <Link href="/extension-privacy" className="underline">확장 프로그램 개인정보처리방침</Link>
            <Link href="/support" className="underline">사용 중 문제 문의하기</Link>
          </div>
        </section>
      </ShellContainer>
    </main>
  );
}
