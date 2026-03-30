"use client";

import Script from "next/script";
import PricingActions from "@/components/PricingActions";
import {
  Eyebrow,
  Panel,
  SectionHeading,
  pageShellClass,
  primaryButtonClass
} from "@/components/marketing/MarketingPrimitives";

interface PricingContentProps {
  userId: string | null;
  userEmail: string | null;
  basicPriceId: string | undefined;
  proPriceId: string | undefined;
  billing: string | undefined;
}

const plans = [
  {
    name: "Free",
    price: "₩0",
    body: "오늘 바로 5번 무료 분석 가능",
    items: ["핵심 리뷰 분석", "카테고리 분포", "우선순위 미리보기"],
    cta: "지금 시작하기"
  },
  {
    name: "Basic",
    price: "₩39,000",
    body: "반복 운영에 필요한 저장과 확장",
    items: ["저장된 분석", "더 많은 결과 공개", "운영용 분석량 확대"],
    cta: "Basic 시작하기",
    plan: "basic" as const
  },
  {
    name: "Pro",
    price: "₩89,000",
    body: "전체 액션과 시뮬레이션까지",
    items: ["평점 시뮬레이션", "전체 액션 아이템", "팀 단위 활용"],
    cta: "Pro 시작하기",
    plan: "pro" as const
  }
];

export default function PricingContent({ userId, userEmail, basicPriceId, proPriceId, billing }: PricingContentProps) {
  return (
    <main className={`${pageShellClass} pt-12`}>
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" />

      <section className="grid gap-10 lg:grid-cols-[0.94fr_1.06fr] lg:items-end">
        <div className="max-w-[640px]">
          <Eyebrow>Pricing</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl md:leading-[0.95]">
            팀의 운영 밀도에 맞게
            <br />
            분석 범위를 확장합니다
          </h1>
          <p className="mt-6 text-base leading-8 text-[var(--color-muted)]">
            무료로 시작한 뒤 저장, 반복 분석, 전체 인사이트 공개 범위를 단계적으로 넓힐 수 있습니다.
          </p>
        </div>
        <Panel className="p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["Free", "핵심 요약과 우선순위 흐름 확인"],
              ["Basic", "반복 운영에 필요한 저장과 재확인"],
              ["Pro", "시뮬레이션과 전체 액션까지 공개"]
            ].map(([label, body]) => (
              <div key={label} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-sm font-medium text-white">{label}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
        {billing === "success" ? <p className="mt-4 text-sm text-white">결제가 완료되었습니다.</p> : null}
        {billing === "cancel" ? <p className="mt-4 text-sm text-[var(--color-warning)]">결제가 취소되었습니다.</p> : null}
      </section>

      <section className="mt-16 grid gap-6 lg:grid-cols-3">
        {plans.map((plan, index) => (
          <Panel
            key={plan.name}
            className={`px-8 py-8 ${
              index === 1 ? "border-[rgba(143,212,255,0.28)] bg-[linear-gradient(180deg,rgba(31,40,56,0.96),rgba(11,16,24,0.98))] lg:-translate-y-2" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="text-2xl font-medium text-[var(--color-text)]">{plan.name}</div>
              {index === 1 ? (
                <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs uppercase tracking-[0.18em] text-white/70">
                  Most used
                </span>
              ) : null}
            </div>
            <div className="mt-7 text-5xl font-semibold tracking-[-0.06em] text-[var(--color-text)]">{plan.price}</div>
            <div className="mt-4 text-base leading-8 text-[var(--color-muted)]">{plan.body}</div>

            <div className="mt-8 space-y-4 border-t border-white/[0.06] pt-7">
              {plan.items.map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm text-[var(--color-muted)]">
                  <span className="text-white">✓</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10">
              {plan.name === "Basic" || plan.name === "Pro" ? (
                <PricingActions
                  plan={plan.name === "Basic" ? "basic" : "pro"}
                  priceId={plan.name === "Basic" ? basicPriceId : proPriceId}
                  userId={userId ?? undefined}
                  userEmail={userEmail ?? undefined}
                />
              ) : (
                <a
                  href="/dashboard"
                  className={`${primaryButtonClass} w-full`}
                >
                  {plan.cta}
                </a>
              )}
            </div>
          </Panel>
        ))}
      </section>

      <section className="mt-24 grid gap-10 lg:grid-cols-[0.96fr_1.04fr]">
        <SectionHeading
          eyebrow="How to choose"
          title="처음에는 Free로, 반복 운영이 생기면 상위 플랜으로"
          body="무료 플랜은 문제 발견에 충분하고, 저장과 반복 회고가 필요해지는 시점부터 Basic과 Pro의 가치가 커집니다."
        />
        <Panel className="p-6">
          <div className="space-y-5">
            {[
              ["Free", "상품별 문제를 먼저 발견하고 팀 내부에서 도입 가치를 확인하는 단계"],
              ["Basic", "분석 결과를 저장하고 주간 단위로 비교해야 하는 운영 단계"],
              ["Pro", "평점 회복 시뮬레이션과 전체 액션 공개가 필요한 집중 개선 단계"]
            ].map(([title, body]) => (
              <div key={title} className="border-t border-white/[0.08] py-4 first:border-t-0 first:pt-0">
                <div className="text-xl font-medium text-white">{title}</div>
                <p className="mt-2 text-base leading-8 text-[var(--color-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}
