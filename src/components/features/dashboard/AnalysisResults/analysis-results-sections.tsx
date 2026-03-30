"use client";

import type { AnalysisOutput } from "@/lib/types";
import PlanGate from "@/components/PlanGate";
import BlurGate from "@/components/BlurGate";
import type { ReactNode } from "react";

type UrgentReview = NonNullable<AnalysisOutput["urgentReviews"]>[number];
type PriorityMatrix = NonNullable<AnalysisOutput["priorityMatrix"]>[number];
type ActionItem = NonNullable<AnalysisOutput["actionItems"]>[number];

function SectionFrame({
  id,
  title,
  description,
  children
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="rounded-[20px] border border-white/10 bg-[rgba(245,239,230,0.03)] p-5">
      <div className="max-w-2xl">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--color-text)]">{title}</h2>
        <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function UrgentReviewsSection({ result, gates }: { result: AnalysisOutput; gates: { urgentReviewVisibleCount: number } }) {
  if (!result.urgentReviews?.length) return null;

  return (
    <SectionFrame id="urgent-section" title="긴급 리뷰" description="최근 작성되었고 영향도가 큰 리뷰를 먼저 확인합니다.">
      <BlurGate visibleCount={gates.urgentReviewVisibleCount} totalCount={result.urgentReviews.length} featureName="긴급 대응">
        <div className="space-y-3">
          {result.urgentReviews.map((item: UrgentReview, index) => (
            <article key={`${item.review.text.slice(0, 24)}-${index}`} className="rounded-[16px] border border-white/8 bg-black/10 p-4">
              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                <span>{item.review.category}</span>
                <span>{item.review.rating === null ? "평점 없음" : `${item.review.rating}점`}</span>
                <span>{item.daysSinceWritten === null ? "날짜 없음" : `${item.daysSinceWritten}일 전`}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-[var(--color-text)]/90">{item.highlightedText || item.review.text}</p>
            </article>
          ))}
        </div>
      </BlurGate>
    </SectionFrame>
  );
}

export function PriorityMatrixSection({ result, gates }: { result: AnalysisOutput; gates: { showPriorityActionSummary: boolean } }) {
  if (!result.priorityMatrix?.length) return null;

  return (
    <SectionFrame id="priority-section" title="우선순위 리스트" description="빈도와 영향도를 함께 반영해 어떤 카테고리부터 개선할지 제안합니다.">
      <div className="space-y-3">
        {result.priorityMatrix.map((item: PriorityMatrix, index) => (
          <div key={`${item.category}-${index}`} className="grid gap-3 rounded-[16px] border border-white/8 bg-black/10 p-4 md:grid-cols-[140px_1fr_120px] md:items-start">
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">{item.category}</div>
              <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">{item.frequencyPct}% share</div>
            </div>
            <div className="text-sm leading-7 text-[var(--color-muted)]">
              {gates.showPriorityActionSummary ? item.actionSummary : "상위 플랜에서 카테고리별 실행 요약을 확인할 수 있습니다."}
            </div>
            <div className="text-right">
              <div className="text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">impact</div>
              <div className="mt-2 text-2xl font-semibold text-[var(--color-text)]">{item.impact}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionFrame>
  );
}

export function RatingSimulationSection({ result }: { result: AnalysisOutput }) {
  if (!result.ratingSimulation?.scenarios?.length) return null;

  return (
    <PlanGate requiredPlan="pro" featureName="평점 시뮬레이션">
      <SectionFrame id="simulation-section" title="시뮬레이션" description="문제를 해결했을 때 평균 평점이 얼마나 회복되는지 예상합니다.">
        <div className="grid gap-4 md:grid-cols-2">
          {result.ratingSimulation.scenarios.map((scenario, index) => (
            <div key={`${scenario.label}-${index}`} className="rounded-[16px] border border-white/8 bg-black/10 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">{scenario.label}</div>
              <div className="mt-3 text-3xl font-semibold text-[var(--color-text)]">{scenario.newAvg.toFixed(2)}</div>
              <div className="mt-2 text-sm text-white">
                {scenario.delta >= 0 ? "+" : ""}
                {scenario.delta.toFixed(2)}
              </div>
            </div>
          ))}
        </div>
      </SectionFrame>
    </PlanGate>
  );
}

export function PositiveKeywordsSection({ result }: { result: AnalysisOutput }) {
  if (!result.positiveKeywords?.length) return null;

  return (
    <PlanGate requiredPlan="pro" featureName="긍정 키워드">
      <SectionFrame id="positive-section" title="긍정 키워드" description="강점으로 유지해야 하는 표현을 별도로 확인합니다.">
        <div className="space-y-3">
          {result.positiveKeywords.map((item) => (
            <div key={item.keyword} className="flex items-center justify-between border-t border-white/8 pt-3 text-sm">
              <span className="text-[var(--color-text)]">{item.keyword}</span>
              <span className="text-[var(--color-muted)]">{item.count}</span>
            </div>
          ))}
        </div>
      </SectionFrame>
    </PlanGate>
  );
}

export function ActionItemsSection({ result, gates }: { result: AnalysisOutput; gates: { actionItemVisibleCount: number } }) {
  if (!result.actionItems?.length) return null;

  return (
    <SectionFrame id="action-section" title="액션 아이템" description="바로 실행할 수 있는 개선 항목을 우선순위 기준으로 정리합니다.">
      <BlurGate visibleCount={gates.actionItemVisibleCount} totalCount={result.actionItems.length} featureName="액션 아이템">
        <div className="space-y-3">
          {result.actionItems.map((item: ActionItem) => (
            <div key={item.id} className="grid gap-3 rounded-[16px] border border-white/8 bg-black/10 p-4 md:grid-cols-[1fr_88px] md:items-start">
              <div>
                <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.16em] text-[var(--color-muted)]">
                  <span>{item.impact}</span>
                  <span>{item.category}</span>
                  {item.relatedKeyword ? <span>{item.relatedKeyword}</span> : null}
                </div>
                <p className="mt-3 text-sm leading-7 text-[var(--color-text)]/90">{item.action}</p>
              </div>
              <div className="text-right text-2xl font-semibold text-[var(--color-text)]">{item.reviewCount}</div>
            </div>
          ))}
        </div>
      </BlurGate>
    </SectionFrame>
  );
}
