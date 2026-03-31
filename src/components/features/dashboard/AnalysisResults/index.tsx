"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import type { Capabilities } from "@/lib/capabilities";
import { mapDashboardViewModel } from "@/lib/dashboard-view";
import type { DashboardAnalysisResult } from "@/lib/api/analysis";
import { useGates } from "@/contexts/PlanContext";
import { buttonStyles } from "@/components/ui/Button";
import { SectionHeader, Surface } from "@/components/ui/Primitives";

interface AnalysisResultsProps {
  result: DashboardAnalysisResult;
  caps: Capabilities | null;
  busy: boolean;
  onDownloadPdf: () => void;
}

function quadrantTone(quadrant: string) {
  if (quadrant === "critical") return "text-[var(--rb-accent)]";
  if (quadrant === "monitor") return "text-[var(--rb-warning)]";
  if (quadrant === "review") return "text-[var(--rb-muted-strong)]";
  return "text-[var(--rb-muted)]";
}

function AnimatedValue({ value }: { value: string }) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (reducedMotion) {
      setDisplay(value);
      return;
    }

    const match = value.match(/-?\d+(\.\d+)?/);
    if (!match) {
      setDisplay(value);
      return;
    }

    const numeric = Number(match[0]);
    if (!Number.isFinite(numeric)) {
      setDisplay(value);
      return;
    }

    const prefix = value.slice(0, match.index ?? 0);
    const suffix = value.slice((match.index ?? 0) + match[0].length);
    const decimals = match[0].includes(".") ? match[0].split(".")[1]?.length ?? 0 : 0;
    const startedAt = performance.now();
    const duration = 650;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const next = numeric * eased;
      setDisplay(`${prefix}${next.toFixed(decimals)}${suffix}`);
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        setDisplay(value);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [reducedMotion, value]);

  return <>{display}</>;
}

export default function AnalysisResults({ result, caps, busy, onDownloadPdf }: AnalysisResultsProps) {
  const gates = useGates();
  const summaryRef = useRef<HTMLDivElement>(null);
  const view = useMemo(() => mapDashboardViewModel(result), [result]);
  const [selectedCategory, setSelectedCategory] = useState(view.categories.find((item) => item.count > 0)?.key ?? view.categories[0]?.key);
  const activeCategory = view.categories.find((item) => item.key === selectedCategory) ?? view.categories[0];
  const activeCategoryKey = activeCategory?.key;

  useEffect(() => {
    if (!activeCategoryKey) return;
    setSelectedCategory(activeCategoryKey);
  }, [activeCategoryKey]);

  useEffect(() => {
    if (!summaryRef.current) return;
    summaryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result]);

  const storageEnabled = caps?.supabaseConfigured === true;
  const positiveKeywordsVisible = gates.showPositiveKeywords && (result.positiveKeywords?.length ?? 0) > 0;
  const simulationsVisible = gates.showRatingSimulation && view.simulations.length > 0;

  return (
    <div className="space-y-6" ref={summaryRef}>
      <Surface className="px-6 py-6 md:px-7">
        <SectionHeader
          eyebrow="Results"
          title={result.meta.filename ?? "분석 결과"}
          description={`${result.meta.stored ? "저장된 리포트" : "세션 결과"} · ${storageEnabled ? caps?.planLabel ?? "계정" : "게스트 모드"}`}
          action={
            <div className="flex flex-wrap gap-3">
              <button className={buttonStyles({ variant: "primary" })} onClick={onDownloadPdf} disabled={busy}>
                PDF 다운로드
              </button>
              <a className={buttonStyles({ variant: "secondary" })} href={storageEnabled ? "/dashboard" : "/dashboard/analyze"}>
                {storageEnabled ? "홈" : "새 분석"}
              </a>
            </div>
          }
        />

        {result.meta.truncated ? (
          <p className="mt-5 text-sm text-[var(--rb-warning)]">
            리뷰 수가 플랜 한도를 초과하여 {gates.maxReviewsPerAnalysis}개만 분석되었습니다. 전체 분석은 Basic 이상으로 업그레이드 후 이용하세요.
          </p>
        ) : null}

        {!result.stats.recentness?.hasDates ? (
          <p className="mt-3 text-sm text-[var(--rb-muted)]">작성일 열이 없으면 최근 이슈는 계산되지 않거나 약하게 반영됩니다.</p>
        ) : null}
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <div className="grid gap-4 md:grid-cols-4">
          {view.summaryMetrics.map((metric) => (
            <div key={metric.label} className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs text-[var(--rb-muted)]">{metric.label}</p>
              <strong className="mt-3 block text-[2.2rem] font-semibold tracking-[-0.06em] text-[var(--rb-fg)]">
                <AnimatedValue value={metric.value} />
              </strong>
              <p className="mt-2 text-sm text-[var(--rb-muted-strong)]">{metric.detail}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Category tabs</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-6">
            {view.categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                className={`rounded-[16px] border px-4 py-4 text-left transition ${
                  selectedCategory === category.key
                    ? "border-[color:rgba(95,198,183,0.28)] bg-[rgba(95,198,183,0.08)]"
                    : "border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] hover:border-[color:rgba(255,255,255,0.12)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--rb-fg)]">{category.key}</span>
                  <span className="text-xs text-[var(--rb-muted)]">{category.percentage.toFixed(1)}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div className="h-full rounded-full bg-[var(--rb-accent)]" style={{ width: `${Math.max(category.percentage, 3)}%` }} />
                </div>
                <p className="mt-3 text-xs text-[var(--rb-muted-strong)]">impact {category.impact}</p>
              </button>
            ))}
          </div>
        </div>
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.2fr)_340px]">
          <div className="space-y-8">
            <section>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Selected category</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{activeCategory?.key ?? "카테고리"}</h2>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--rb-muted-strong)]">{activeCategory?.actionSummary ?? "카테고리 요약이 없습니다."}</p>
            </section>

            <section className="border-t border-[color:rgba(255,255,255,0.06)] pt-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Urgent reviews</p>
              <div className="mt-5 space-y-4">
                {(activeCategory?.urgentReviews ?? []).slice(0, gates.urgentReviewVisibleCount).map((item, index) => (
                  <article key={`${item.review.text.slice(0, 24)}-${index}`} className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex items-center justify-between gap-4 text-xs text-[var(--rb-muted)]">
                      <span>{item.review.rating === null ? "미기재" : `${item.review.rating}점`}</span>
                      <span>{item.daysSinceWritten === null ? "날짜 없음" : `${item.daysSinceWritten}일 전`}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--rb-fg)]">{item.highlightedText || item.review.text}</p>
                  </article>
                ))}
                {(activeCategory?.urgentReviews ?? []).length === 0 ? <p className="text-sm text-[var(--rb-muted)]">선택한 카테고리의 긴급 리뷰가 없습니다.</p> : null}
              </div>
            </section>

            <section className="border-t border-[color:rgba(255,255,255,0.06)] pt-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Priority list</p>
              <div className="mt-5 space-y-4">
                {view.priorities.map((item) => (
                  <div key={item.category} className="grid gap-3 border-b border-[color:rgba(255,255,255,0.06)] pb-4 last:border-b-0">
                    <div className="flex items-center justify-between gap-4">
                      <strong className="text-base font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{item.category}</strong>
                      <span className={`text-xs uppercase tracking-[0.18em] ${quadrantTone(item.quadrant)}`}>{item.quadrant}</span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[var(--rb-muted)]">
                      <span>{item.share}</span>
                      <span>impact {item.impact}</span>
                    </div>
                    <p className="text-sm leading-7 text-[var(--rb-muted-strong)]">{item.actionSummary}</p>
                  </div>
                ))}
                {view.priorities.length === 0 ? <p className="text-sm text-[var(--rb-muted)]">우선순위 계산 결과가 없습니다.</p> : null}
              </div>
            </section>

            <section className="border-t border-[color:rgba(255,255,255,0.06)] pt-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Action items</p>
              <div className="mt-5 space-y-4">
                {view.actionItems.slice(0, gates.actionItemVisibleCount).map((item) => (
                  <div key={item.id} className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-xs uppercase tracking-[0.18em] text-[var(--rb-muted)]">{item.impact}</span>
                      <span className="text-xs text-[var(--rb-muted)]">{item.reviewCount} reviews</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--rb-fg)]">{item.action}</p>
                    {item.relatedKeyword ? <p className="mt-2 text-xs text-[var(--rb-muted)]">keyword: {item.relatedKeyword}</p> : null}
                  </div>
                ))}
                {view.actionItems.length === 0 ? <p className="text-sm text-[var(--rb-muted)]">액션 아이템이 없습니다.</p> : null}
              </div>
            </section>
          </div>

          <div className="space-y-8 border-t border-[color:rgba(255,255,255,0.06)] pt-8 xl:border-t-0 xl:border-l xl:border-[color:rgba(255,255,255,0.06)] xl:pl-8 xl:pt-0">
            <section>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Keywords</p>
              <div className="mt-5 space-y-3">
                {view.keywords.slice(0, 8).map((keyword) => (
                  <div key={keyword.keyword} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-[var(--rb-fg)]">{keyword.keyword}</span>
                    <span className="text-[var(--rb-muted)]">{keyword.count}</span>
                  </div>
                ))}
                {view.keywords.length === 0 ? <p className="text-sm text-[var(--rb-muted)]">키워드가 없습니다.</p> : null}
              </div>
            </section>

            <section className="border-t border-[color:rgba(255,255,255,0.06)] pt-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Simulation</p>
              <div className="mt-5 grid gap-4">
                {simulationsVisible ? (
                  view.simulations.map((simulation) => (
                    <div key={simulation.label} className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                      <p className="text-xs text-[var(--rb-muted)]">{simulation.label}</p>
                      <strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{simulation.value}</strong>
                      <span className="mt-3 inline-flex rounded-full border border-[color:rgba(95,198,183,0.18)] bg-[rgba(95,198,183,0.08)] px-3 py-1 text-xs font-medium text-[var(--rb-accent)]">
                        {simulation.delta}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--rb-muted)]">시뮬레이션은 Pro 플랜에서 제공됩니다.</p>
                )}
              </div>
            </section>

            <section className="border-t border-[color:rgba(255,255,255,0.06)] pt-8">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Positive keywords</p>
              <div className="mt-5 space-y-3">
                {positiveKeywordsVisible ? (
                  result.positiveKeywords?.slice(0, 8).map((item) => (
                    <div key={item.keyword} className="flex items-center justify-between gap-4 text-sm">
                      <span className="text-[var(--rb-fg)]">{item.keyword}</span>
                      <span className="text-[var(--rb-muted)]">{item.count}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--rb-muted)]">긍정 키워드는 Pro 플랜에서 제공됩니다.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </Surface>
    </div>
  );
}
