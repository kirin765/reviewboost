"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer } from "@/components/ui/Primitives";
import Reveal from "@/components/ui/Reveal";
import { getSiteContent } from "@/lib/site-content";
import { useTranslation } from "@/lib/i18n";

function useCanObserveInView() {
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return mounted && !reducedMotion && typeof window !== "undefined" && "IntersectionObserver" in window;
}

function EditorialIntro({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="grid gap-6 border-b border-[color:rgba(222,230,242,0.1)] pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(260px,420px)] lg:items-start">
      <div>
        <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">{eyebrow}</p>
        <h2 className="mt-3 max-w-3xl text-[clamp(2.2rem,4vw,4.2rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-white">
          {title}
        </h2>
      </div>
      {description ? <p className="max-w-xl text-base leading-8 text-[var(--rb-muted-strong)]">{description}</p> : null}
    </div>
  );
}

function SummaryRibbon({ metrics }: { metrics: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-4 border-b border-[color:rgba(222,230,242,0.08)] pb-5 sm:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <div key={metric.label}>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--rb-muted)]">{metric.label}</p>
          <strong className="mt-2 block text-[clamp(1.55rem,2vw,2rem)] font-semibold tracking-[-0.05em] text-white">
            {metric.value}
          </strong>
        </div>
      ))}
    </div>
  );
}

function CategoryRail({
  categories,
  animated = false
}: {
  categories: Array<{ label: string; share: string; impact: number }>;
  animated?: boolean;
}) {
  const canObserve = useCanObserveInView();

  return (
    <div className="space-y-4">
      {categories.map((category, index) => (
        <div key={category.label}>
          <div className="mb-2 flex items-center justify-between gap-4 text-sm text-[var(--rb-muted-strong)]">
            <span>{category.label}</span>
            <span>
              {category.share} · impact {category.impact}
            </span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
            <motion.div
              className="h-full rounded-full bg-[var(--rb-accent)]"
              initial={animated && canObserve ? { width: 0, opacity: 0.7 } : false}
              whileInView={animated && canObserve ? { width: category.share, opacity: 1 } : undefined}
              viewport={animated && canObserve ? { once: true, amount: 0.6 } : undefined}
              transition={{ duration: 0.55, delay: 0.06 * index, ease: [0.16, 1, 0.3, 1] }}
              style={!animated || !canObserve ? { width: category.share } : undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({
  accent = "rgba(107,210,193,0.95)",
  secondary = "rgba(255,244,229,0.62)"
}: {
  accent?: string;
  secondary?: string;
}) {
  const fillId = React.useId();
  const canObserve = useCanObserveInView();

  return (
    <svg viewBox="0 0 420 240" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(107,210,193,0.26)" />
          <stop offset="100%" stopColor="rgba(107,210,193,0)" />
        </linearGradient>
      </defs>
      <path d="M0 210H420" stroke="rgba(222,230,242,0.08)" strokeWidth="1" />
      <path d="M0 150C50 148 84 142 126 132C172 121 210 110 262 96C308 84 348 58 420 44" fill="none" stroke={secondary} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M0 228L0 176C42 170 88 160 128 146C178 128 226 111 284 86C332 65 372 48 420 24V228Z" fill={`url(#${fillId})`} />
      <motion.path
        d="M0 176C42 170 88 160 128 146C178 128 226 111 284 86C332 65 372 48 420 24"
        fill="none"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        initial={canObserve ? { pathLength: 0.2, opacity: 0.4 } : false}
        whileInView={canObserve ? { pathLength: 1, opacity: 1 } : undefined}
        viewport={canObserve ? { once: true, amount: 0.4 } : undefined}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      />
      <circle cx="420" cy="24" r="4.5" fill={accent} />
    </svg>
  );
}

function DonutChart({ share }: { share: number }) {
  return (
    <div
      className="mx-auto aspect-square w-full max-w-[220px] rounded-full"
      style={{
        background: `conic-gradient(var(--rb-accent) 0 ${share}%, rgba(245,241,232,0.92) ${share}% 72%, rgba(117,132,154,0.42) 72% 100%)`
      }}
      aria-hidden="true"
    >
      <div className="m-auto mt-[18%] flex aspect-square w-[64%] items-center justify-center rounded-full bg-[var(--rb-surface-strong)] text-center">
        <div>
          <span className="block text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">negative</span>
          <strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em] text-white">{share}%</strong>
        </div>
      </div>
    </div>
  );
}

function HeroPreview({
  label,
  lead,
  metrics,
  categories,
  simulations
}: {
  label: string;
  lead: string;
  metrics: Array<{ label: string; value: string }>;
  categories: Array<{ label: string; share: string; impact: number }>;
  simulations: Array<{ label: string; value: string; delta: string }>;
}) {
  return (
    <div className="mt-12 rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(22,29,38,0.96),rgba(17,23,31,0.94))] p-4 shadow-[0_40px_80px_rgba(0,0,0,0.32)] md:p-6 lg:p-8">
      <div className="grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{label}</p>
          <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{lead}</p>
          <div className="mt-8 space-y-5">
            <div className="rounded-[20px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">Urgent reviews</p>
              <div className="mt-4 space-y-4">
                <div>
                  <p className="text-xs text-[var(--rb-muted)]">품질 · 1일 전</p>
                  <p className="mt-2 text-sm leading-7 text-white">“받자마자 마감이 벌어져 있어서 바로 반품 고민했습니다.”</p>
                </div>
                <div className="border-t border-[color:rgba(222,230,242,0.08)] pt-4">
                  <p className="text-xs text-[var(--rb-muted)]">사용성 · 3일 전</p>
                  <p className="mt-2 text-sm leading-7 text-white">“설명과 달리 조립이 어렵고 사용법이 직관적이지 않았어요.”</p>
                </div>
              </div>
            </div>
            <div className="rounded-[20px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">Expected lift</p>
              <div className="mt-4 space-y-3">
                {simulations.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[var(--rb-muted-strong)]">{item.label}</span>
                    <span className="text-white">
                      {item.value} <span className="text-[var(--rb-accent)]">{item.delta}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-7">
          <SummaryRibbon metrics={metrics} />
          <div className="grid gap-6 xl:grid-cols-[minmax(0,0.92fr)_minmax(220px,0.62fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">Category distribution</p>
              <div className="mt-4">
                <CategoryRail categories={categories} animated />
              </div>
            </div>
            <div className="rounded-[22px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">Rating recovery</p>
              <div className="mt-4 h-[180px]">
                <LineChart />
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[var(--rb-muted-strong)]">
                <span>current 3.33</span>
                <span>target 4.67</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductWorkspace({
  metrics,
  categories,
  items
}: {
  metrics: Array<{ label: string; value: string }>;
  categories: Array<{ label: string; share: string; impact: number }>;
  items: Array<{ title: string; body: string; stat: string }>;
}) {
  return (
    <div className="rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(19,26,34,0.96),rgba(16,22,30,0.92))] p-5 md:p-7">
      <SummaryRibbon metrics={metrics} />

      <div className="mt-7 border-b border-[color:rgba(222,230,242,0.08)] pb-7">
        <div className="flex flex-wrap gap-3">
          {categories.map((category, index) => (
            <div
              key={category.label}
              className={`rounded-full border px-4 py-2 text-sm ${
                index === 1
                  ? "border-[color:rgba(107,210,193,0.28)] bg-[rgba(107,210,193,0.1)] text-white"
                  : "border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.02)] text-[var(--rb-muted-strong)]"
              }`}
            >
              {category.label} {category.share}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1.12fr)_320px]">
        <div className="space-y-7">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">Urgent reviews</p>
            <div className="mt-4 space-y-4">
              <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-4">
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--rb-muted)]">
                  <span>품질</span>
                  <span>impact 9</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-white">상품 설명과 다르게 품질 편차가 커서 재구매를 망설인다는 리뷰가 반복됩니다.</p>
              </div>
              <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-4">
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--rb-muted)]">
                  <span>배송</span>
                  <span>impact 7</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-white">파손과 지연이 함께 언급되어 언박싱 만족도가 처음부터 떨어집니다.</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 text-xs text-[var(--rb-muted)]">
                  <span>사용성</span>
                  <span>impact 7</span>
                </div>
                <p className="mt-3 text-sm leading-7 text-white">설명서와 실제 사용감의 차이로 설치 난이도가 높게 느껴집니다.</p>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {items.map((item) => (
              <div key={item.title} className="border-t border-[color:rgba(222,230,242,0.08)] pt-4">
                <p className="text-xs text-[var(--rb-muted)]">{item.stat}</p>
                <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-[color:rgba(222,230,242,0.08)] pt-7 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">Action strip</p>
          <div className="mt-4 space-y-4">
            <div className="rounded-[18px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-xs text-[var(--rb-muted)]">Priority 1</p>
              <p className="mt-2 text-sm leading-7 text-white">상세페이지 첫 화면에서 품질 보증과 실제 소재 설명을 명확히 강화합니다.</p>
            </div>
            <div className="rounded-[18px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-xs text-[var(--rb-muted)]">Priority 2</p>
              <p className="mt-2 text-sm leading-7 text-white">파손/지연 후기에는 배송 포장과 출고 기준을 먼저 공지합니다.</p>
            </div>
            <div className="rounded-[18px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-4">
              <p className="text-xs text-[var(--rb-muted)]">Simulation</p>
              <p className="mt-2 text-sm leading-7 text-white">25% 개선 시 3.67, 75% 개선 시 4.67까지 회복 가능합니다.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultGraph({
  metrics,
  categories,
  simulations,
  graph
}: {
  metrics: Array<{ label: string; value: string }>;
  categories: Array<{ label: string; share: string; impact: number }>;
  simulations: Array<{ label: string; value: string; delta: string }>;
  graph: {
    heroMetricLabel: string;
    heroMetricValue: string;
    heroMetricBody: string;
    lineChartTitle: string;
    lineChartCompare: string;
    donutTitle: string;
    donutBody: string;
    trendTitle: string;
    trendValue: string;
    trendBody: string;
  };
}) {
  const negativeShare = Number.parseFloat(metrics.find((metric) => metric.label === "Negative rate")?.value ?? "33");
  const canObserve = useCanObserveInView();

  return (
    <div className="rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(30,44,34,0.96),rgba(19,31,23,0.92))] p-5 shadow-[0_34px_76px_rgba(0,0,0,0.28)] md:p-7">
      <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.58fr)_minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.62)]">{graph.heroMetricLabel}</p>
          <strong className="mt-3 block text-[clamp(3rem,5vw,4.8rem)] font-semibold leading-none tracking-[-0.08em] text-white">
            {graph.heroMetricValue}
          </strong>
          <p className="mt-4 max-w-[24ch] text-sm leading-7 text-[rgba(245,241,232,0.8)]">{graph.heroMetricBody}</p>
        </div>
        <div className="rounded-[22px] border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.62)]">{graph.lineChartTitle}</p>
              <p className="mt-2 text-sm text-[rgba(245,241,232,0.8)]">{graph.lineChartCompare}</p>
            </div>
            <span className="text-xs text-[rgba(245,241,232,0.6)]">0 → 6 months</span>
          </div>
          <div className="mt-4 h-[240px]">
            <LineChart accent="rgba(245,241,232,0.95)" secondary="rgba(245,241,232,0.48)" />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(260px,0.58fr)_minmax(0,1fr)]">
        <div className="rounded-[22px] border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.62)]">{graph.donutTitle}</p>
          <p className="mt-2 max-w-[28ch] text-sm leading-7 text-[rgba(245,241,232,0.8)]">{graph.donutBody}</p>
          <div className="mt-8">
            <DonutChart share={negativeShare} />
          </div>
        </div>

        <div className="rounded-[22px] border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
          <div className="grid gap-5 md:grid-cols-[minmax(180px,220px)_minmax(0,1fr)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[rgba(245,241,232,0.62)]">{graph.trendTitle}</p>
              <strong className="mt-3 block text-[clamp(2.6rem,4vw,4rem)] font-semibold leading-none tracking-[-0.06em] text-white">
                {graph.trendValue}
              </strong>
              <p className="mt-4 max-w-[26ch] text-sm leading-7 text-[rgba(245,241,232,0.8)]">{graph.trendBody}</p>
            </div>
            <div>
              <div className="mt-2 h-[180px]">
                <svg viewBox="0 0 360 180" className="h-full w-full" aria-hidden="true">
                  <path d="M0 160H360" stroke="rgba(245,241,232,0.12)" strokeWidth="1" />
                  <path d="M0 148L72 148L104 112L168 112L200 74L254 66L308 42L360 24" fill="none" stroke="rgba(245,241,232,0.42)" strokeWidth="2.2" strokeLinecap="round" />
                  <motion.path
                    d="M0 148L72 148L104 112L168 112L200 74L254 66L308 42L360 24"
                    fill="none"
                    stroke="rgba(255,244,229,0.95)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={canObserve ? { pathLength: 0.2, opacity: 0.4 } : false}
                    whileInView={canObserve ? { pathLength: 1, opacity: 1 } : undefined}
                    viewport={canObserve ? { once: true, amount: 0.4 } : undefined}
                    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                  />
                </svg>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {simulations.map((simulation) => (
                  <div key={simulation.label} className="rounded-[16px] border border-[color:rgba(255,255,255,0.08)] bg-[rgba(12,20,16,0.34)] p-4">
                    <p className="text-xs text-[rgba(245,241,232,0.62)]">{simulation.label}</p>
                    <strong className="mt-2 block text-2xl font-semibold tracking-[-0.05em] text-white">{simulation.value}</strong>
                    <p className="mt-2 text-sm text-[var(--rb-accent)]">{simulation.delta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-sm text-[rgba(245,241,232,0.72)]">
                {categories.map((category) => `${category.label} ${category.share}`).join(" / ")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HomePageContent() {
  const { locale } = useTranslation();
  const reducedMotion = useReducedMotion();
  const content = getSiteContent(locale);
  const pricing = content.pricing;

  return (
    <div className="pb-12">
      <ShellContainer className="pt-8 md:pt-12">
        <motion.section
          data-home-section="hero"
          initial={reducedMotion ? false : { opacity: 0, y: 32 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative overflow-hidden rounded-[36px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(18,24,31,0.98),rgba(11,16,23,0.96))] px-5 py-10 shadow-[0_40px_90px_rgba(0,0,0,0.3)] md:px-8 md:py-12 lg:px-12 lg:py-14"
        >
          <div className="absolute inset-y-0 left-0 w-[32%] bg-[radial-gradient(circle_at_left,rgba(107,210,193,0.08),transparent_70%)]" aria-hidden="true" />
          <div className="absolute inset-y-0 right-0 w-[28%] bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.05),transparent_70%)]" aria-hidden="true" />

          <div className="relative mx-auto max-w-4xl text-center">
            <p className="text-[11px] uppercase tracking-[0.26em] text-[var(--rb-muted)]">{content.home.hero.eyebrow}</p>
            <h1 className="mt-6 text-[clamp(3.2rem,7vw,6rem)] font-semibold leading-[0.92] tracking-[-0.08em] text-white">
              {content.home.hero.title}
            </h1>
            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[var(--rb-muted-strong)] md:text-lg">
              {content.home.hero.lead}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/dashboard/analyze" className={buttonStyles({ variant: "primary", size: "lg" })}>
                {content.home.hero.primaryCta}
              </Link>
              <Link href="/coupang-csv" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                {content.home.hero.secondaryCta}
              </Link>
              <Link href="/signup" className={buttonStyles({ variant: "ghost", size: "lg" })}>
                {content.home.hero.tertiaryCta}
              </Link>
            </div>
          </div>

          <HeroPreview
            label={content.home.hero.previewLabel}
            lead={content.home.hero.previewLead}
            metrics={content.home.result.metrics}
            categories={content.home.result.categories}
            simulations={content.home.result.simulations}
          />
        </motion.section>
      </ShellContainer>

      <ShellContainer className="mt-20 space-y-24">
        <Reveal>
          <section data-home-section="problem" className="space-y-8">
            <EditorialIntro
              eyebrow={content.home.problem.eyebrow}
              title={content.home.problem.title}
              description={content.home.problem.lead}
            />
            <div className="rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(18,24,31,0.94),rgba(13,19,26,0.92))] p-5 md:p-7">
              <div className="grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(280px,0.82fr)]">
                <div className="rounded-[24px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.02)] p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Raw review stream</p>
                  <div className="mt-5 space-y-5">
                    <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-4">
                      <p className="text-sm font-medium text-white">리뷰 A</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">배송이 늦었고 포장도 아쉬웠는데 제품 품질도 기대보다 떨어져서 재구매는 고민됩니다.</p>
                    </div>
                    <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-4">
                      <p className="text-sm font-medium text-white">리뷰 B</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">후기 수는 많은데 최근 한 달 리뷰에서 품질 이슈가 반복되는지 바로 구분하기 어렵습니다.</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">리뷰 C</p>
                      <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">별점만 보면 3점대지만, 실제로는 어떤 카테고리를 먼저 고칠지 감이 오지 않습니다.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {content.home.problem.items.map((item) => (
                    <div key={item.title} className="border-t border-[color:rgba(222,230,242,0.1)] pt-5">
                      <h3 className="text-2xl font-semibold tracking-[-0.04em] text-white">{item.title}</h3>
                      <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">{item.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="solution" className="space-y-8">
            <EditorialIntro
              eyebrow={content.home.solution.eyebrow}
              title={content.home.solution.title}
              description={content.home.solution.lead}
            />
            <div className="rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(24,31,39,0.96),rgba(17,23,31,0.92))] p-5 md:p-7">
              <div className="flex flex-wrap items-center gap-3 border-b border-[color:rgba(222,230,242,0.08)] pb-6 text-sm text-[var(--rb-muted-strong)]">
                {content.home.solution.flow.map((step, index) => (
                  <React.Fragment key={step.title}>
                    <span>{step.title}</span>
                    {index < content.home.solution.flow.length - 1 ? <span className="text-[var(--rb-muted)]">→</span> : null}
                  </React.Fragment>
                ))}
              </div>

              <div className="mt-7 grid gap-4 xl:grid-cols-4">
                {content.home.solution.strip.map((item) => (
                  <div key={item.title} className="rounded-[24px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.03)] p-5">
                    <div className="flex h-24 items-center justify-center rounded-[18px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.04)]">
                      <span className="rounded-full border border-[color:rgba(107,210,193,0.3)] bg-[rgba(107,210,193,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--rb-accent)]">
                        {item.meta}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-semibold tracking-[-0.04em] text-white">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{item.body}</p>
                  </div>
                ))}
              </div>

              <div className="mt-7 flex flex-wrap gap-x-8 gap-y-3 border-t border-[color:rgba(222,230,242,0.08)] pt-6 text-sm text-[var(--rb-muted-strong)]">
                {content.home.solution.assurances.map((item) => (
                  <span key={item} className="inline-flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[var(--rb-accent)]" aria-hidden="true" />
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="product" className="space-y-8">
            <EditorialIntro
              eyebrow={content.home.product.eyebrow}
              title={content.home.product.title}
              description={content.home.product.lead}
            />
            <ProductWorkspace
              metrics={content.home.result.metrics}
              categories={content.home.result.categories}
              items={content.home.product.items}
            />
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="result" className="space-y-8">
            <EditorialIntro
              eyebrow={content.home.result.eyebrow}
              title={content.home.result.title}
              description={content.home.result.lead}
            />
            <ResultGraph
              metrics={content.home.result.metrics}
              categories={content.home.result.categories}
              simulations={content.home.result.simulations}
              graph={content.home.result.graph}
            />
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="pricing" className="space-y-8">
            <EditorialIntro
              eyebrow={content.home.pricing.eyebrow}
              title={content.home.pricing.title}
              description={content.home.pricing.lead}
            />
            <div className="overflow-hidden rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(19,26,34,0.94),rgba(14,20,28,0.92))]">
              <div className="grid gap-0 lg:grid-cols-3">
                {pricing.plans.map((plan) => (
                  <div
                    key={plan.name}
                    className={`border-b border-[color:rgba(222,230,242,0.08)] px-5 py-6 last:border-b-0 lg:border-b-0 lg:border-r last:lg:border-r-0 md:px-7 ${
                      plan.recommended ? "bg-[rgba(107,210,193,0.06)]" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{plan.label}</p>
                        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                          {plan.name === "free" ? "무료" : plan.name === "basic" ? "Basic" : "Pro"}
                        </h3>
                      </div>
                      {plan.recommended ? (
                        <span className="rounded-full border border-[color:rgba(107,210,193,0.22)] bg-[rgba(107,210,193,0.1)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--rb-accent)]">
                          Recommended
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-5">
                      {plan.originalPrice ? <p className="text-sm text-[var(--rb-muted)] line-through">{plan.originalPrice}</p> : null}
                      <strong className="mt-1 block text-4xl font-semibold tracking-[-0.06em] text-white">{plan.price}</strong>
                      <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{plan.meta}</p>
                    </div>
                    <div className="mt-6 space-y-3">
                      {plan.features.map((feature) => (
                        <div key={feature.label} className="flex items-center justify-between gap-4 border-t border-[color:rgba(222,230,242,0.08)] pt-3 text-sm">
                          <span className="text-[var(--rb-muted-strong)]">{feature.label}</span>
                          <span className="text-white">{feature.value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6">
                      <Link href="/pricing" className={buttonStyles({ variant: plan.recommended ? "primary" : "secondary" })}>
                        {plan.cta}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="faq" className="space-y-8">
            <EditorialIntro eyebrow={content.home.faq.eyebrow} title={content.home.faq.title} description="" />
            <div className="border-t border-[color:rgba(222,230,242,0.08)]">
              {content.home.faq.items.map((item) => (
                <div key={item.question} className="grid gap-4 border-b border-[color:rgba(222,230,242,0.08)] py-6 md:grid-cols-[280px_minmax(0,1fr)]">
                  <h3 className="text-lg font-semibold tracking-[-0.03em] text-white">{item.question}</h3>
                  <p className="text-sm leading-7 text-[var(--rb-muted-strong)]">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="cta">
            <div className="rounded-[30px] border border-[color:rgba(222,230,242,0.12)] bg-[linear-gradient(180deg,rgba(229,234,243,0.94),rgba(208,216,230,0.92))] px-5 py-7 text-[#111827] shadow-[0_30px_60px_rgba(0,0,0,0.16)] md:px-8 md:py-9">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#5b6472]">{content.home.cta.eyebrow}</p>
                  <h2 className="mt-4 text-[clamp(2.2rem,4vw,4rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[#111827]">
                    {content.home.cta.title}
                  </h2>
                  <p className="mt-4 text-base leading-8 text-[#4b5565]">{content.home.cta.lead}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/signup" className={buttonStyles({ variant: "primary", size: "lg" })}>
                    {content.home.cta.primary}
                  </Link>
                  <Link href="/coupang-csv" className={buttonStyles({ variant: "secondary", size: "lg", className: "bg-white text-[#111827] hover:bg-[#f4f7fb]" })}>
                    {content.home.cta.secondary}
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </ShellContainer>
    </div>
  );
}
