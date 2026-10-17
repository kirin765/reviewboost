"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import ExtensionPlans from "@/components/extension/ExtensionPlans";
import PricingActions from "@/components/PricingActions";
import { SectionHeader, ShellContainer, Surface } from "@/components/ui/Primitives";
import { getSiteContent } from "@/lib/site-content";
import { useTranslation } from "@/lib/i18n";

function BillingNotice() {
  const billing = useSearchParams().get("billing");

  if (billing === "success") {
    return <p className="mt-5 text-sm text-[var(--rb-accent)]">결제가 완료되었습니다. 구독 상태 반영까지 최대 1분 정도 소요될 수 있습니다.</p>;
  }
  if (billing === "cancel") {
    return <p className="mt-5 text-sm text-[var(--rb-warning)]">결제가 취소되었습니다. 다시 시도하실 수 있습니다.</p>;
  }
  return null;
}

export default function PricingContent() {
  const { locale } = useTranslation();
  const content = getSiteContent(locale).pricing;

  return (
    <main className="pageMain pricingPage pb-8">
      <ShellContainer className="pt-8 md:pt-12">
        <Surface className="px-6 py-7 md:px-8 md:py-9">
          <p className="text-sm text-[var(--rb-accent)]">리뷰 수집 요금제</p>
          <h1 className="mt-3 text-balance text-3xl font-semibold md:text-4xl">무료로 시작하고, 필요한 만큼 수집하세요</h1>
          <p className="mt-5 max-w-3xl text-pretty leading-8 text-[var(--rb-muted-strong)]">하루 50개 무료 수집부터 월 4,900원 Extension 구독까지. 먼저 내 상품의 리뷰를 엑셀·CSV로 내려받아 보세요.</p>
          <Suspense fallback={null}>
            <BillingNotice />
          </Suspense>
        </Surface>
      </ShellContainer>

      <ShellContainer className="mt-8"><ExtensionPlans placement="pricing" /></ShellContainer>
      <ShellContainer className="mt-16">
        <div id="analysis-plans" className="scroll-mt-36 mb-8">
          <h2 className="text-balance text-2xl font-semibold">리뷰를 더 깊이 살펴보고 싶다면: AI 분석 요금제</h2>
          <p className="mt-4 text-pretty leading-8 text-[var(--rb-muted-strong)]">감성·이슈 분류와 개선안, PDF 리포트가 필요할 때 선택하세요. Basic·Pro에는 Extension의 일일 수집 한도 해제가 포함되어 별도 결제가 필요 없습니다.</p>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {content.plans.map((plan) => {
            const planName = plan.name === "free" ? "무료" : plan.name === "basic" ? "Basic" : "Pro";
            return (
              <Surface
                key={plan.name}
                className={`flex h-full flex-col p-6 md:p-7 ${plan.recommended ? "border-[color:rgba(91,92,234,0.28)] shadow-[0_28px_54px_rgba(10,28,27,0.38)]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{plan.label}</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{planName}</h2>
                  </div>
                  {plan.recommended ? (
                    <span className="rounded-full border border-[color:rgba(91,92,234,0.18)] bg-[rgba(91,92,234,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--rb-accent)]">
                      추천
                    </span>
                  ) : null}
                </div>
                <div className="mt-6">
                  {plan.originalPrice ? <p className="text-sm text-[var(--rb-muted)] line-through">{plan.originalPrice}</p> : null}
                  <strong className="mt-1 block text-[2.8rem] font-semibold leading-none tracking-[-0.08em] text-[var(--rb-fg)]">{plan.price}</strong>
                  <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">{plan.meta}</p>
                </div>
                <div className="mt-6 flex-1 space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature.label} className="flex items-center justify-between gap-4 border-b border-[color:#e6e8f2] pb-3 text-sm last:border-b-0">
                      <span className="text-[var(--rb-muted-strong)]">{feature.label}</span>
                      <span className="text-[var(--rb-fg)]">{feature.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-7">
                  {plan.name === "basic" ? (
                    <PricingActions plan="basic" />
                  ) : plan.name === "pro" ? (
                    <PricingActions plan="pro" />
                  ) : (
                    <a className="btn btnPrimary w-full justify-center" href="/dashboard">
                      {plan.cta}
                    </a>
                  )}
                </div>
              </Surface>
            );
          })}
        </div>
      </ShellContainer>



      <ShellContainer className="mt-8">
        <Surface className="px-6 py-6 md:px-8">
          <SectionHeader eyebrow="안내" title={content.noteTitle} description={content.noteLead} />
        </Surface>
      </ShellContainer>
    </main>
  );
}
