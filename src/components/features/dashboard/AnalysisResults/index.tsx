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
  downloadHref?: string;
  headerDescription?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  resultContext?: {
    source: "live" | "saved_full" | "saved_legacy";
    legacyNotice?: string;
    unavailableSections?: ReadonlyArray<"simulation" | "positiveKeywords">;
  };
}

type ResultTone = "danger" | "warning" | "info" | "accent" | "neutral";

const TONE_STYLES: Record<ResultTone, { panel: string; bar: string; badge: string; label: string }> = {
  danger: {
    panel: "border-[color:rgba(255,138,138,0.18)] bg-[linear-gradient(180deg,rgba(42,20,24,0.78),rgba(25,16,19,0.72))]",
    bar: "bg-[#ff8b8b]",
    badge: "border-[color:rgba(255,138,138,0.2)] bg-[rgba(255,138,138,0.1)] text-[#ffc0c0]",
    label: "text-[#ffb1b1]"
  },
  warning: {
    panel: "border-[color:rgba(245,185,110,0.18)] bg-[linear-gradient(180deg,rgba(43,31,20,0.78),rgba(26,21,16,0.72))]",
    bar: "bg-[var(--rb-warning)]",
    badge: "border-[color:rgba(245,185,110,0.2)] bg-[rgba(245,185,110,0.1)] text-[#ffd09b]",
    label: "text-[#f4c68d]"
  },
  info: {
    panel: "border-[color:rgba(132,162,255,0.2)] bg-[linear-gradient(180deg,rgba(19,30,48,0.78),rgba(17,21,29,0.72))]",
    bar: "bg-[#8ba6ff]",
    badge: "border-[color:rgba(132,162,255,0.2)] bg-[rgba(132,162,255,0.1)] text-[#becbff]",
    label: "text-[#b5c5ff]"
  },
  accent: {
    panel: "border-[color:rgba(107,210,193,0.22)] bg-[linear-gradient(180deg,rgba(17,38,36,0.78),rgba(14,23,24,0.72))]",
    bar: "bg-[var(--rb-accent)]",
    badge: "border-[color:rgba(107,210,193,0.2)] bg-[rgba(107,210,193,0.1)] text-[#a8ece1]",
    label: "text-[#9fe4d7]"
  },
  neutral: {
    panel: "border-[color:rgba(255,255,255,0.08)] bg-[linear-gradient(180deg,rgba(23,30,39,0.84),rgba(18,24,31,0.72))]",
    bar: "bg-[rgba(255,255,255,0.18)]",
    badge: "border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.04)] text-[var(--rb-muted-strong)]",
    label: "text-[var(--rb-muted)]"
  }
};

function quadrantTone(quadrant: string): ResultTone {
  if (quadrant === "critical") return "danger";
  if (quadrant === "monitor") return "warning";
  if (quadrant === "review") return "info";
  return "neutral";
}

function quadrantLabel(quadrant: string) {
  if (quadrant === "critical") return "즉시 대응";
  if (quadrant === "monitor") return "주의 관찰";
  if (quadrant === "review") return "검토 필요";
  return "관찰";
}

function impactLabel(impact: string) {
  if (impact === "high") return "영향도 높음";
  if (impact === "medium") return "영향도 중간";
  return "영향도 낮음";
}

function actionCategoryLabel(category: string) {
  if (category === "detailPage") return "상세페이지";
  if (category === "csResponse") return "CS 응대";
  if (category === "faq") return "FAQ";
  return "운영";
}

function resolveStorageNotice(meta: DashboardAnalysisResult["meta"]) {
  if (meta.storageAttempted !== true) return null;

  if (meta.stored && meta.storageWarning) {
    return {
      tone: TONE_STYLES.warning,
      title: "요약 저장 완료",
      message: meta.storageWarning
    };
  }

  if (meta.stored) {
    return {
      tone: TONE_STYLES.accent,
      title: "저장 완료",
      message: "이번 분석 결과가 히스토리에 저장되었습니다."
    };
  }

  if (meta.storageError) {
    return {
      tone: TONE_STYLES.danger,
      title: "저장 실패",
      message: "저장에 실패해 이번 결과는 히스토리에 남지 않았습니다."
    };
  }

  return null;
}

function TonedSection({
  tone,
  eyebrow,
  title,
  description,
  children,
  dataTone,
  className = ""
}: {
  tone: ResultTone;
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  dataTone: string;
  className?: string;
}) {
  const styles = TONE_STYLES[tone];

  return (
    <section
      data-tone={dataTone}
      className={`rounded-[20px] border p-5 shadow-[0_16px_36px_rgba(0,0,0,0.18)] ${styles.panel} ${className}`}
    >
      <div className={`h-1.5 w-14 rounded-full ${styles.bar}`} aria-hidden="true" />
      <p className={`mt-4 text-[11px] uppercase tracking-[0.22em] ${styles.label}`}>{eyebrow}</p>
      <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{title}</h2>
      {description ? <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p> : null}
      <div className="mt-5">{children}</div>
    </section>
  );
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

export default function AnalysisResults({
  result,
  caps,
  busy,
  onDownloadPdf,
  downloadHref,
  headerDescription,
  secondaryHref,
  secondaryLabel,
  resultContext
}: AnalysisResultsProps) {
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
  const unavailableSections = new Set(resultContext?.unavailableSections ?? []);
  const positiveKeywordsEnabled = gates.showPositiveKeywords;
  const positiveKeywordsAvailable = !unavailableSections.has("positiveKeywords");
  const positiveKeywordItems = result.positiveKeywords?.slice(0, 8) ?? [];
  const simulationsEnabled = gates.showRatingSimulation;
  const simulationsAvailable = !unavailableSections.has("simulation");
  const resolvedHeaderDescription =
    headerDescription ?? `${result.meta.stored ? "저장된 리포트" : "이번 분석 결과"} · ${storageEnabled ? `${caps?.planLabel ?? "계정"} 플랜` : "게스트 모드"}`;
  const resolvedSecondaryHref = secondaryHref ?? (storageEnabled ? "/dashboard" : "/dashboard/analyze");
  const resolvedSecondaryLabel = secondaryLabel ?? (storageEnabled ? "홈" : "새 분석");
  const storageNotice = resolveStorageNotice(result.meta);
  const suggestionGroups = [
    { title: "상세페이지 반영", items: result.suggestions.detailPageCopy },
    { title: "CS 응대 템플릿", items: result.suggestions.csResponseTemplates },
    { title: "FAQ 추천", items: result.suggestions.faqRecommendations },
    { title: "운영 메모", items: result.suggestions.notes }
  ];
  const summaryTones: ResultTone[] = ["danger", "neutral", "warning", "info"];

  return (
    <div className="space-y-6" ref={summaryRef}>
      <Surface className="px-6 py-6 md:px-7">
        <SectionHeader
          eyebrow="분석 결과"
          title={result.meta.filename ?? "분석 결과"}
          description={resolvedHeaderDescription}
          action={
            <div className="flex flex-wrap gap-3">
              {downloadHref ? (
                <a className={buttonStyles({ variant: "primary" })} href={downloadHref}>
                  PDF 다운로드
                </a>
              ) : (
                <button className={buttonStyles({ variant: "primary" })} onClick={onDownloadPdf} disabled={busy}>
                  PDF 다운로드
                </button>
              )}
              <a className={buttonStyles({ variant: "secondary" })} href={resolvedSecondaryHref}>
                {resolvedSecondaryLabel}
              </a>
            </div>
          }
        />

        {result.meta.truncated ? (
          <p className="mt-5 text-sm text-[var(--rb-warning)]">
            리뷰 수가 플랜 한도를 초과하여 {gates.maxReviewsPerAnalysis}개만 분석되었습니다. 전체 분석은 Basic 이상으로 이용하세요.
          </p>
        ) : null}

        {storageNotice ? (
          <div className={`mt-5 rounded-[16px] border px-4 py-4 ${storageNotice.tone.panel}`}>
            <div className={`h-1.5 w-12 rounded-full ${storageNotice.tone.bar}`} aria-hidden="true" />
            <p className={`mt-4 text-[11px] uppercase tracking-[0.2em] ${storageNotice.tone.label}`}>{storageNotice.title}</p>
            <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">{storageNotice.message}</p>
          </div>
        ) : null}

        {resultContext?.source === "saved_legacy" ? (
          <div className={`mt-5 rounded-[16px] border px-4 py-4 ${TONE_STYLES.info.panel}`}>
            <div className={`h-1.5 w-12 rounded-full ${TONE_STYLES.info.bar}`} aria-hidden="true" />
            <p className={`mt-4 text-[11px] uppercase tracking-[0.2em] ${TONE_STYLES.info.label}`}>이전 형식 저장본</p>
            <p className="mt-2 text-sm leading-7 text-[var(--rb-muted-strong)]">
              {resultContext.legacyNotice ?? "이 저장본은 이전 형식으로 저장되어 일부 섹션은 추정값 또는 비어 있는 상태로 표시됩니다."}
            </p>
          </div>
        ) : null}

        {!result.stats.recentness?.hasDates ? (
          <p className="mt-3 text-sm text-[var(--rb-muted)]">작성일 열이 없으면 최근 이슈는 계산되지 않거나 약하게 반영됩니다.</p>
        ) : null}
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <div className="grid gap-4 md:grid-cols-4">
          {view.summaryMetrics.map((metric, index) => {
            const tone = TONE_STYLES[summaryTones[index] ?? "neutral"];
            return (
              <div
                key={metric.label}
                className={`rounded-[18px] border p-4 shadow-[0_12px_24px_rgba(0,0,0,0.14)] ${tone.panel}`}
              >
                <div className={`h-1.5 w-12 rounded-full ${tone.bar}`} aria-hidden="true" />
                <p className={`mt-4 text-xs ${tone.label}`}>{metric.label}</p>
                <strong className="mt-3 block text-[2.2rem] font-semibold tracking-[-0.06em] text-[var(--rb-fg)]">
                  <AnimatedValue value={metric.value} />
                </strong>
                <p className="mt-2 text-sm text-[var(--rb-muted-strong)]">{metric.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">카테고리</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-6">
            {view.categories.map((category) => (
              <button
                key={category.key}
                type="button"
                onClick={() => setSelectedCategory(category.key)}
                className={`rounded-[18px] border px-4 py-4 text-left transition ${
                  selectedCategory === category.key
                    ? "border-[color:rgba(245,185,110,0.24)] bg-[rgba(245,185,110,0.08)]"
                    : "border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] hover:border-[color:rgba(255,255,255,0.12)] hover:bg-[rgba(255,255,255,0.03)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[var(--rb-fg)]">{category.key}</span>
                  <span className="text-xs text-[var(--rb-muted)]">{category.percentage.toFixed(1)}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
                  <div
                    className={`h-full rounded-full ${selectedCategory === category.key ? "bg-[var(--rb-warning)]" : "bg-[var(--rb-accent)]"}`}
                    style={{ width: `${Math.max(category.percentage, 3)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs text-[var(--rb-muted-strong)]">영향도 {category.impact}</p>
              </button>
            ))}
          </div>
        </div>
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1.18fr)_360px]">
          <div className="space-y-6">
            <TonedSection
              tone="neutral"
              eyebrow="선택한 카테고리"
              title={activeCategory?.key ?? "카테고리"}
              description={activeCategory?.actionSummary ?? "카테고리 요약이 없습니다."}
              dataTone="category"
            >
              <div className="flex flex-wrap gap-3">
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${TONE_STYLES.warning.badge}`}>
                  비중 {activeCategory?.percentage.toFixed(1) ?? "0.0"}%
                </span>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${TONE_STYLES.neutral.badge}`}>
                  영향도 {activeCategory?.impact ?? 0}
                </span>
                <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${TONE_STYLES.neutral.badge}`}>
                  리뷰 {activeCategory?.count ?? 0}건
                </span>
              </div>
            </TonedSection>

            <TonedSection tone="danger" eyebrow="긴급 대응 리뷰" title="지금 바로 봐야 할 리뷰" dataTone="urgent">
              <div className="space-y-4">
                {(activeCategory?.urgentReviews ?? []).slice(0, gates.urgentReviewVisibleCount).map((item, index) => (
                  <article
                    key={`${item.review.text.slice(0, 24)}-${index}`}
                    className="rounded-[16px] border border-[color:rgba(255,138,138,0.18)] bg-[rgba(255,138,138,0.06)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--rb-muted)]">
                      <span className={`inline-flex rounded-full border px-3 py-1 ${TONE_STYLES.danger.badge}`}>
                        {item.review.rating === null ? "별점 미기재" : `${item.review.rating}점`}
                      </span>
                      <span>{item.daysSinceWritten === null ? "작성일 없음" : `${item.daysSinceWritten}일 전`}</span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--rb-fg)]">{item.highlightedText || item.review.text}</p>
                  </article>
                ))}
                {(activeCategory?.urgentReviews ?? []).length === 0 ? <p className="text-sm text-[var(--rb-muted)]">선택한 카테고리의 긴급 리뷰가 없습니다.</p> : null}
              </div>
            </TonedSection>

            <TonedSection tone="warning" eyebrow="우선순위" title="먼저 고칠 문제 순서" dataTone="priority">
              <div className="space-y-4">
                {view.priorities.map((item) => {
                  const tone = TONE_STYLES[quadrantTone(item.quadrant)];
                  return (
                    <div key={item.category} className="grid gap-3 border-b border-[color:rgba(255,255,255,0.06)] pb-4 last:border-b-0">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <strong className="text-base font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{item.category}</strong>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${tone.badge}`}>{quadrantLabel(item.quadrant)}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--rb-muted)]">
                        <span>비중 {item.share}</span>
                        <span>영향도 {item.impact}</span>
                      </div>
                      <p className="text-sm leading-7 text-[var(--rb-muted-strong)]">{item.actionSummary}</p>
                    </div>
                  );
                })}
                {view.priorities.length === 0 ? <p className="text-sm text-[var(--rb-muted)]">우선순위 계산 결과가 없습니다.</p> : null}
              </div>
            </TonedSection>

            <TonedSection tone="accent" eyebrow="액션 아이템" title="바로 실행할 작업" dataTone="action">
              <div className="space-y-4">
                {view.actionItems.slice(0, gates.actionItemVisibleCount).map((item) => (
                  <div
                    key={item.id}
                    className="rounded-[16px] border border-[color:rgba(107,210,193,0.18)] bg-[rgba(107,210,193,0.06)] p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${TONE_STYLES.accent.badge}`}>
                        {impactLabel(item.impact)}
                      </span>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${TONE_STYLES.neutral.badge}`}>
                        {actionCategoryLabel(item.category)}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-7 text-[var(--rb-fg)]">{item.action}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-xs text-[var(--rb-muted)]">
                      <span>관련 리뷰 {item.reviewCount}건</span>
                      {item.relatedKeyword ? <span>연관 키워드 {item.relatedKeyword}</span> : null}
                    </div>
                  </div>
                ))}
                {view.actionItems.length === 0 ? <p className="text-sm text-[var(--rb-muted)]">액션 아이템이 없습니다.</p> : null}
              </div>
            </TonedSection>
          </div>

          <div className="space-y-6 border-t border-[color:rgba(255,255,255,0.06)] pt-8 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
            <TonedSection tone="warning" eyebrow="부정 키워드" title="가장 많이 나온 불만" dataTone="keyword">
              <div className="space-y-3">
                {view.keywords.slice(0, 8).map((keyword) => (
                  <div
                    key={keyword.keyword}
                    className="flex items-center justify-between gap-4 rounded-[14px] border border-[color:rgba(245,185,110,0.16)] bg-[rgba(245,185,110,0.06)] px-4 py-3 text-sm"
                  >
                    <span className="text-[var(--rb-fg)]">{keyword.keyword}</span>
                    <span className="text-[var(--rb-muted)]">{keyword.count}건</span>
                  </div>
                ))}
                {view.keywords.length === 0 ? <p className="text-sm text-[var(--rb-muted)]">키워드가 없습니다.</p> : null}
              </div>
            </TonedSection>

            <TonedSection tone="info" eyebrow="개선 시뮬레이션" title="문제를 해결하면 바뀌는 수치" dataTone="simulation">
              <div className="grid gap-4">
                {simulationsAvailable && simulationsEnabled && view.simulations.length > 0 ? (
                  view.simulations.map((simulation) => (
                    <div
                      key={simulation.label}
                      className="rounded-[16px] border border-[color:rgba(132,162,255,0.18)] bg-[rgba(132,162,255,0.06)] p-4"
                    >
                      <p className="text-xs text-[#b7c7ff]">{simulation.label}</p>
                      <strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{simulation.value}</strong>
                      <div className="mt-3 flex flex-wrap gap-3">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${TONE_STYLES.info.badge}`}>{simulation.delta}</span>
                        {simulation.relatedKeywords.slice(0, 2).map((keyword) => (
                          <span key={`${simulation.label}-${keyword}`} className={`inline-flex rounded-full border px-3 py-1 text-xs ${TONE_STYLES.neutral.badge}`}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                ) : !simulationsAvailable ? (
                  <p className="text-sm text-[var(--rb-muted)]">이 저장본에는 해당 데이터가 없습니다.</p>
                ) : !simulationsEnabled ? (
                  <p className="text-sm text-[var(--rb-muted)]">시뮬레이션은 Pro 플랜에서 제공됩니다.</p>
                ) : (
                  <p className="text-sm text-[var(--rb-muted)]">시뮬레이션 데이터가 없습니다.</p>
                )}
              </div>
            </TonedSection>

            <TonedSection tone="neutral" eyebrow="긍정 키워드" title="유지해야 할 강점" dataTone="positive">
              <div className="space-y-3">
                {positiveKeywordsAvailable && positiveKeywordsEnabled && positiveKeywordItems.length > 0 ? (
                  positiveKeywordItems.map((item) => (
                    <div
                      key={item.keyword}
                      className="flex items-center justify-between gap-4 rounded-[14px] border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-4 py-3 text-sm"
                    >
                      <span className="text-[var(--rb-fg)]">{item.keyword}</span>
                      <span className="text-[var(--rb-muted)]">{item.count}건</span>
                    </div>
                  ))
                ) : !positiveKeywordsAvailable ? (
                  <p className="text-sm text-[var(--rb-muted)]">이 저장본에는 해당 데이터가 없습니다.</p>
                ) : !positiveKeywordsEnabled ? (
                  <p className="text-sm text-[var(--rb-muted)]">긍정 키워드는 Pro 플랜에서 제공됩니다.</p>
                ) : (
                  <p className="text-sm text-[var(--rb-muted)]">긍정 키워드가 없습니다.</p>
                )}
              </div>
            </TonedSection>
          </div>
        </div>
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <div className="grid gap-6 lg:grid-cols-2">
          {suggestionGroups.map((group) => (
            <TonedSection
              key={group.title}
              tone="neutral"
              eyebrow="활용 제안"
              title={group.title}
              dataTone="suggestion"
              className="h-full"
            >
              <div className="space-y-3">
                {group.items.length > 0 ? (
                  group.items.map((item, index) => (
                    <p key={`${group.title}-${index}`} className="border-b border-[color:rgba(255,255,255,0.06)] pb-3 text-sm leading-7 text-[var(--rb-muted-strong)] last:border-b-0 last:pb-0">
                      {item}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-[var(--rb-muted)]">저장된 제안이 없습니다.</p>
                )}
              </div>
            </TonedSection>
          ))}
        </div>
      </Surface>
    </div>
  );
}
