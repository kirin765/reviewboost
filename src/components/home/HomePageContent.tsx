import React from "react";
import Link from "next/link";
import HomeHero from "./HomeHero";
import { ShellContainer } from "@/components/ui/Primitives";
import ExtensionInstallLink from "@/components/extension/ExtensionInstallLink";
import ExtensionPlans from "@/components/extension/ExtensionPlans";
import { extensionProduct, extensionSteps, extensionFaqs } from "@/lib/extension-content";

const workflows = [
  { title: "내 상품의 리뷰 정리", body: "상품 리뷰를 파일로 모아 별점과 작성일로 살펴보세요. 반복되는 배송·품질 의견을 직접 분류할 수 있습니다." },
  { title: "주간 운영 보고 준비", body: "필요한 상품의 리뷰를 수집해 엑셀로 저장하세요. 기존 보고서에 리뷰 근거를 더할 수 있습니다." },
  { title: "여러 쇼핑몰의 리뷰 확보", body: "지원 쇼핑몰에서 같은 확장 프로그램으로 수집하세요. 상품 하나씩 열어 필요한 리뷰를 내려받습니다." }
];

export default function HomePageContent() {
  return (
    <ShellContainer className="space-y-16 py-10 md:space-y-24 md:py-16">
      <HomeHero />

      <section aria-labelledby="platforms-heading" className="border-y border-[var(--rb-border)] py-7">
        <h2 id="platforms-heading" className="text-balance text-lg font-semibold">하나의 확장 프로그램, 12개 쇼핑몰</h2>
        <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[var(--rb-muted-strong)]">{extensionProduct.platforms.map(platform => <li key={platform}>{platform}</li>)}</ul>
        <p className="mt-4 text-pretty text-xs leading-6 text-[var(--rb-muted-strong)]">상품 상세 페이지에서 수집합니다. 쇼핑몰의 로그인 요구, 화면 변경, 접근 제한에 따라 수집이 제한될 수 있습니다.</p>
      </section>

      <section id="how-to" aria-labelledby="how-to-heading" className="scroll-mt-28">
        <h2 id="how-to-heading" className="text-balance text-3xl font-semibold">상품 페이지에서 파일 저장까지</h2>
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-center">
          <ol className="space-y-6">{extensionSteps.map((step, index) => <li key={step} className="flex gap-4"><span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[var(--rb-accent)] text-sm text-white tabular-nums">{index + 1}</span><p className="text-pretty leading-8">{step}</p></li>)}</ol>
          <figure className="min-w-0">
            <video controls muted playsInline preload="none" poster="/blog-images/reviewboost-extension-export.png" aria-label="ReviewBoost 리뷰 수집과 엑셀 다운로드 사용 예시 영상" className="aspect-video w-full rounded-xl border border-[var(--rb-border)]">
              <source src="/extension-promo.mp4" type="video/mp4" />
              영상이 표시되지 않으면 왼쪽 사용 순서를 확인하세요.
            </video>
            <figcaption className="mt-3 text-pretty text-sm leading-7 text-[var(--rb-muted-strong)]">30초 사용 예시 영상. 영상의 수집 시간은 예시이며 실제 시간과 수집량은 상품·쇼핑몰에 따라 달라집니다.</figcaption>
          </figure>
        </div>
        <div className="mt-7 flex flex-wrap gap-5 text-sm">
          <Link href="/help/coupang-review-csv-export" className="underline">쿠팡 사용 가이드</Link>
          <Link href="/help/smartstore-review-csv-export" className="underline">스마트스토어 사용 가이드</Link>
          <Link href="/extension" className="underline">전체 기능·수집 한도</Link>
        </div>
      </section>

      <section aria-labelledby="workflows-heading">
        <h2 id="workflows-heading" className="text-balance text-3xl font-semibold">리뷰를 정기적으로 살펴보는 팀을 위해</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-3">{workflows.map(item => <div key={item.title} className="border-t border-[var(--rb-border)] pt-5"><h3 className="text-balance text-xl font-semibold">{item.title}</h3><p className="mt-4 text-pretty leading-8 text-[var(--rb-muted-strong)]">{item.body}</p></div>)}</div>
      </section>

      <section id="plans" aria-labelledby="plans-heading" className="scroll-mt-28">
        <h2 id="plans-heading" className="text-balance text-3xl font-semibold">무료로 확인하고, 필요할 때 더 수집하세요</h2>
        <div className="mt-8"><ExtensionPlans placement="home_pricing" /></div>
      </section>

      <section className="rounded-2xl border border-[var(--rb-border)] p-6 md:p-8" aria-labelledby="analysis-heading">
        <p className="text-sm text-[var(--rb-accent)]">선택 기능 · AI 리뷰 분석</p>
        <h2 id="analysis-heading" className="mt-3 text-balance text-2xl font-semibold">파일 정리 다음에는, 리뷰 속 문제 찾기</h2>
        <p className="mt-4 max-w-3xl text-pretty leading-8 text-[var(--rb-muted-strong)]">수집한 리뷰의 감성, 이슈 카테고리, 부정 키워드를 살펴보고 싶다면 ReviewBoost로 분석하세요. 파일 다운로드만 이용할 수도 있습니다.</p>
        <div className="mt-5 flex flex-wrap gap-5 text-sm"><Link href="/features/ai-review-analysis" className="underline">AI 분석 기능 보기</Link><Link href="/pricing#analysis-plans" className="underline">분석 요금제 보기</Link><Link href="/dashboard/analyze" className="underline">이미 파일이 있다면 분석하기</Link></div>
      </section>

      <section aria-labelledby="faq-heading">
        <h2 id="faq-heading" className="text-balance text-3xl font-semibold">설치 전에 궁금한 점</h2>
        <div className="mt-8 space-y-6">{extensionFaqs.map(faq => <div key={faq.question} className="border-t border-[var(--rb-border)] pt-5"><h3 className="text-balance text-lg font-semibold">{faq.question}</h3><p className="mt-3 text-pretty leading-8 text-[var(--rb-muted-strong)]">{faq.answer}</p></div>)}</div>
      </section>

      <section className="text-center">
        <h2 className="text-balance text-3xl font-semibold">첫 리뷰 파일을 만들어 보세요</h2>
        <p className="mt-4 text-pretty leading-7 text-[var(--rb-muted-strong)]">무료로 하루 50개까지 수집할 수 있습니다.</p>
        <div className="mt-6"><ExtensionInstallLink placement="home_bottom" /></div>
      </section>
    </ShellContainer>
  );
}
