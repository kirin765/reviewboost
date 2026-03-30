"use client";

import React from "react";
import Script from "next/script";
import PricingActions from "@/components/PricingActions";
import { SectionHeader, ShellContainer, Surface } from "@/components/ui/Primitives";
import { getSiteContent } from "@/lib/site-content";
import { useTranslation } from "@/lib/i18n";

interface PricingContentProps {
  userId: string | null;
  userEmail: string | null;
  basicPriceId: string | undefined;
  proPriceId: string | undefined;
  billing: string | undefined;
}

export default function PricingContent({ userId, userEmail, basicPriceId, proPriceId, billing }: PricingContentProps) {
  const { locale } = useTranslation();
  const content = getSiteContent(locale).pricing;

  return (
    <main className="pageMain pricingPage pb-8">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" />

      <ShellContainer className="pt-8 md:pt-12">
        <Surface className="px-6 py-7 md:px-8 md:py-9">
          <SectionHeader eyebrow={content.eyebrow} title={content.title} description={content.lead} />
          <div className="mt-6 flex flex-wrap gap-3">
            {content.pills.map((pill) => (
              <span
                key={pill}
                className="rounded-full border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-[var(--rb-muted-strong)]"
              >
                {pill}
              </span>
            ))}
          </div>
          {billing === "success" ? <p className="mt-5 text-sm text-[var(--rb-accent)]">결제가 완료되었습니다. 구독 상태 반영까지 최대 1분 정도 소요될 수 있습니다.</p> : null}
          {billing === "cancel" ? <p className="mt-5 text-sm text-[var(--rb-warning)]">결제가 취소되었습니다. 다시 시도하실 수 있습니다.</p> : null}
        </Surface>
      </ShellContainer>

      <ShellContainer className="mt-8">
        <div className="grid gap-4 lg:grid-cols-3">
          {content.plans.map((plan) => {
            const planName = plan.name === "free" ? "무료" : plan.name === "basic" ? "Basic" : "Pro";
            return (
              <Surface
                key={plan.name}
                className={`flex h-full flex-col p-6 md:p-7 ${plan.recommended ? "border-[color:rgba(95,198,183,0.28)] shadow-[0_28px_54px_rgba(10,28,27,0.38)]" : ""}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{plan.label}</p>
                    <h2 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{planName}</h2>
                  </div>
                  {plan.recommended ? (
                    <span className="rounded-full border border-[color:rgba(95,198,183,0.18)] bg-[rgba(95,198,183,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--rb-accent)]">
                      Recommended
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
                    <div key={feature.label} className="flex items-center justify-between gap-4 border-b border-[color:rgba(255,255,255,0.06)] pb-3 text-sm last:border-b-0">
                      <span className="text-[var(--rb-muted-strong)]">{feature.label}</span>
                      <span className="text-[var(--rb-fg)]">{feature.value}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-7">
                  {plan.name === "basic" ? (
                    <PricingActions plan="basic" priceId={basicPriceId} userId={userId ?? undefined} userEmail={userEmail ?? undefined} />
                  ) : plan.name === "pro" ? (
                    <PricingActions plan="pro" priceId={proPriceId} userId={userId ?? undefined} userEmail={userEmail ?? undefined} />
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
          <SectionHeader eyebrow="Note" title={content.noteTitle} description={content.noteLead} />
        </Surface>
      </ShellContainer>
    </main>
  );
}
