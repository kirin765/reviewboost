"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { buttonStyles } from "@/components/ui/Button";
import { SectionHeader, ShellContainer, Surface } from "@/components/ui/Primitives";
import Reveal from "@/components/ui/Reveal";
import { getSiteContent } from "@/lib/site-content";
import { useTranslation } from "@/lib/i18n";

export default function HomePageContent() {
  const { locale } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const canObserve = mounted && !reducedMotion && typeof window !== "undefined" && "IntersectionObserver" in window;
  const content = getSiteContent(locale);
  const pricing = content.pricing;

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="pb-8">
      <ShellContainer className="pt-8 md:pt-12">
        <motion.section
          data-home-section="hero"
          initial={reducedMotion ? false : { opacity: 0, y: 28 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_420px]"
        >
          <div className="rounded-[24px] border border-[color:var(--rb-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-6 py-7 shadow-[0_28px_64px_rgba(0,0,0,0.32)] md:px-8 md:py-10">
            <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">{content.home.hero.eyebrow}</p>
            <h1 className="mt-5 max-w-4xl text-[clamp(2.8rem,6vw,5.6rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-[var(--rb-fg)]">
              {content.home.hero.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--rb-muted-strong)] md:text-lg">
              {content.home.hero.lead}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/dashboard" className={buttonStyles({ variant: "primary", size: "lg" })}>
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

          <Surface className="overflow-hidden px-5 py-5 md:px-6 md:py-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">Review board</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em]">Urgent product issues</h2>
              </div>
              <span className="rounded-full border border-[color:rgba(95,198,183,0.2)] bg-[rgba(95,198,183,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-[var(--rb-accent)]">
                calm mode
              </span>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {content.home.result.metrics.map((metric) => (
                <div key={metric.label} className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
                  <p className="text-xs text-[var(--rb-muted)]">{metric.label}</p>
                  <strong className="mt-2 block text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{metric.value}</strong>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              {content.home.result.categories.slice(0, 4).map((category, index) => (
                <div key={category.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-[var(--rb-muted-strong)]">
                    <span>{category.label}</span>
                    <span>impact {category.impact}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                    <motion.div
                      className="h-full rounded-full bg-[var(--rb-accent)]"
                      initial={reducedMotion ? false : { width: 0, opacity: 0.7 }}
                      whileInView={canObserve ? { width: category.share, opacity: 1 } : undefined}
                      viewport={canObserve ? { once: true, margin: "-60px" } : undefined}
                      transition={{ duration: 0.55, delay: 0.08 * index, ease: [0.16, 1, 0.3, 1] }}
                      style={!canObserve ? { width: category.share, opacity: 1 } : reducedMotion ? { width: category.share } : undefined}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Surface>
        </motion.section>
      </ShellContainer>

      <ShellContainer className="mt-20 space-y-20">
        <Reveal>
          <section data-home-section="problem">
            <SectionHeader eyebrow={content.home.problem.eyebrow} title={content.home.problem.title} description={content.home.problem.lead} />
            <div className="mt-8 grid gap-5 lg:grid-cols-3">
              {content.home.problem.items.map((item) => (
                <div key={item.title} className="border-t border-[color:rgba(255,255,255,0.08)] pt-5">
                  <h3 className="text-xl font-medium tracking-[-0.03em] text-[var(--rb-fg)]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{item.body}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="solution">
            <SectionHeader eyebrow={content.home.solution.eyebrow} title={content.home.solution.title} description={content.home.solution.lead} />
            <div className="mt-8 grid gap-4 md:grid-cols-5">
              {content.home.solution.flow.map((step, index) => (
                <div key={step.title} className="rounded-[16px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">0{index + 1}</p>
                  <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{step.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{step.body}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="product">
            <SectionHeader eyebrow={content.home.product.eyebrow} title={content.home.product.title} description={content.home.product.lead} />
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <Surface className="p-6 md:p-7">
                <div className="grid gap-6">
                  {content.home.product.items.map((item) => (
                    <div key={item.title} className="grid gap-3 border-b border-[color:rgba(255,255,255,0.06)] pb-5 last:border-b-0 last:pb-0 md:grid-cols-[180px_minmax(0,1fr)]">
                      <div>
                        <p className="text-xs text-[var(--rb-muted)]">{item.stat}</p>
                        <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{item.title}</h3>
                      </div>
                      <p className="text-sm leading-7 text-[var(--rb-muted-strong)]">{item.body}</p>
                    </div>
                  ))}
                </div>
              </Surface>
              <Surface className="p-6 md:p-7">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Analytical layout</p>
                <div className="mt-5 grid gap-4">
                  <div className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="text-xs text-[var(--rb-muted)]">Top</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">Negative rate, average rating, priority score, recent weight</p>
                  </div>
                  <div className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="text-xs text-[var(--rb-muted)]">Middle</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">Category tabs with share and impact</p>
                  </div>
                  <div className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="text-xs text-[var(--rb-muted)]">Bottom</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">Urgent reviews, priority list, simulation, keywords, action items</p>
                  </div>
                </div>
              </Surface>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="result">
            <SectionHeader eyebrow={content.home.result.eyebrow} title={content.home.result.title} description={content.home.result.lead} />
            <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <Surface className="p-6 md:p-7">
                <div className="grid gap-4 md:grid-cols-4">
                  {content.home.result.metrics.map((metric) => (
                    <div key={metric.label} className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                      <p className="text-xs text-[var(--rb-muted)]">{metric.label}</p>
                      <strong className="mt-2 block text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{metric.value}</strong>
                    </div>
                  ))}
                </div>
                <div className="mt-8 grid gap-4">
                  {content.home.result.categories.map((category, index) => (
                    <div key={category.label}>
                      <div className="mb-2 flex items-center justify-between text-sm text-[var(--rb-muted-strong)]">
                        <span>{category.label}</span>
                        <span>{category.share} · impact {category.impact}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                        <motion.div
                          className="h-full rounded-full bg-[var(--rb-accent)]"
                          initial={reducedMotion ? false : { width: 0 }}
                          whileInView={canObserve ? { width: category.share } : undefined}
                          viewport={canObserve ? { once: true, margin: "-60px" } : undefined}
                          transition={{ duration: 0.5, delay: 0.04 * index, ease: [0.16, 1, 0.3, 1] }}
                          style={!canObserve ? { width: category.share } : reducedMotion ? { width: category.share } : undefined}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Surface>

              <Surface className="p-6">
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Simulation</p>
                <div className="mt-5 grid gap-4">
                  {content.home.result.simulations.map((item) => (
                    <div key={item.label} className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                      <p className="text-xs text-[var(--rb-muted)]">{item.label}</p>
                      <strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em]">{item.value}</strong>
                      <span className="mt-2 inline-flex rounded-full border border-[color:rgba(95,198,183,0.18)] bg-[rgba(95,198,183,0.08)] px-3 py-1 text-xs font-medium text-[var(--rb-accent)]">
                        {item.delta}
                      </span>
                    </div>
                  ))}
                </div>
              </Surface>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="pricing">
            <SectionHeader eyebrow={content.home.pricing.eyebrow} title={content.home.pricing.title} description={content.home.pricing.lead} action={<Link href="/pricing" className={buttonStyles({ variant: "secondary" })}>전체 요금제 보기</Link>} />
            <div className="mt-8 grid gap-4 lg:grid-cols-3">
              {pricing.plans.map((plan) => (
                <Surface
                  key={plan.name}
                  className={`p-6 ${plan.recommended ? "border-[color:rgba(95,198,183,0.26)] shadow-[0_26px_54px_rgba(10,28,27,0.44)]" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{plan.label}</p>
                      <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{plan.name === "free" ? "무료" : plan.name === "basic" ? "Basic" : "Pro"}</h3>
                    </div>
                    {plan.recommended ? (
                      <span className="rounded-full border border-[color:rgba(95,198,183,0.18)] bg-[rgba(95,198,183,0.08)] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--rb-accent)]">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-5">
                    {plan.originalPrice ? <p className="text-sm text-[var(--rb-muted)] line-through">{plan.originalPrice}</p> : null}
                    <strong className="mt-1 block text-4xl font-semibold tracking-[-0.06em] text-[var(--rb-fg)]">{plan.price}</strong>
                    <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{plan.meta}</p>
                  </div>
                  <div className="mt-6 space-y-3">
                    {plan.features.map((feature) => (
                      <div key={feature.label} className="flex items-center justify-between gap-4 border-b border-[color:rgba(255,255,255,0.06)] pb-3 text-sm last:border-b-0">
                        <span className="text-[var(--rb-muted-strong)]">{feature.label}</span>
                        <span className="text-[var(--rb-fg)]">{feature.value}</span>
                      </div>
                    ))}
                  </div>
                </Surface>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="faq">
            <SectionHeader eyebrow={content.home.faq.eyebrow} title={content.home.faq.title} />
            <div className="mt-8 grid gap-4">
              {content.home.faq.items.map((item) => (
                <div key={item.question} className="grid gap-3 rounded-[16px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] px-5 py-5 md:grid-cols-[260px_minmax(0,1fr)]">
                  <h3 className="text-base font-medium tracking-[-0.03em] text-[var(--rb-fg)]">{item.question}</h3>
                  <p className="text-sm leading-7 text-[var(--rb-muted-strong)]">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal>
          <section data-home-section="cta">
            <Surface className="overflow-hidden px-6 py-7 md:px-8 md:py-9">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-3xl">
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">{content.home.cta.eyebrow}</p>
                  <h2 className="mt-4 text-[clamp(2rem,4vw,3.8rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-[var(--rb-fg)]">{content.home.cta.title}</h2>
                  <p className="mt-5 text-base leading-8 text-[var(--rb-muted-strong)]">{content.home.cta.lead}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Link href="/signup" className={buttonStyles({ variant: "primary", size: "lg" })}>
                    {content.home.cta.primary}
                  </Link>
                  <Link href="/coupang-csv" className={buttonStyles({ variant: "secondary", size: "lg" })}>
                    {content.home.cta.secondary}
                  </Link>
                </div>
              </div>
            </Surface>
          </section>
        </Reveal>
      </ShellContainer>
    </div>
  );
}
