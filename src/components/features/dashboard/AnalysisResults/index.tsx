"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AnalysisOutput, PlanGates } from "@/lib/types";
import type { Capabilities } from "@/lib/capabilities";
import AnalysisResultDigest from "@/components/Analysis/AnalysisResultDigest";
import { useGates } from "@/contexts/PlanContext";
import { AnalysisResultsSummary } from "./analysis-results-summary";
import {
  ActionItemsSection,
  PriorityMatrixSection,
  PositiveKeywordsSection,
  RatingSimulationSection,
  UrgentReviewsSection
} from "./analysis-results-sections";

interface AnalysisResultsProps {
  result: AnalysisOutput & {
    meta: {
      filename: string | null;
      stored: boolean;
      analysisId?: string;
      truncated?: boolean;
    };
  };
  caps: Capabilities | null;
  busy: boolean;
  onDownloadPdf: () => void;
}

export default function AnalysisResults({ result, caps, busy, onDownloadPdf }: AnalysisResultsProps) {
  const gates: PlanGates = useGates();
  const [notice, setNotice] = useState<string | null>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result || !summaryCardRef.current) return;
    summaryCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setNotice("분석이 완료되었습니다.");
  }, [result]);

  const navItems = useMemo(
    () => [
      { href: "#digest-section", label: "핵심 지표", enabled: true },
      { href: "#urgent-section", label: "긴급 리뷰", enabled: Boolean(result.urgentReviews?.length) },
      { href: "#priority-section", label: "우선순위", enabled: Boolean(result.priorityMatrix?.length) },
      { href: "#simulation-section", label: "시뮬레이션", enabled: Boolean(result.ratingSimulation?.scenarios?.length) },
      { href: "#positive-section", label: "키워드", enabled: Boolean(result.positiveKeywords?.length) },
      { href: "#action-section", label: "액션", enabled: Boolean(result.actionItems?.length) }
    ],
    [result.actionItems?.length, result.priorityMatrix?.length, result.positiveKeywords?.length, result.ratingSimulation?.scenarios?.length, result.urgentReviews?.length]
  );

  return (
    <div className="space-y-6">
      {notice ? (
        <div className="rounded-[16px] border border-[var(--color-primary)]/30 bg-[rgba(91,108,255,0.1)] px-4 py-3 text-sm text-[var(--color-text)]/90">
          {notice}
        </div>
      ) : null}

      <section ref={summaryCardRef}>
        <AnalysisResultsSummary result={result} onDownloadPdf={onDownloadPdf} busy={busy} caps={caps} gates={gates} />
      </section>

      <nav className="flex flex-wrap gap-2" aria-label="결과 섹션">
        {navItems.filter((item) => item.enabled).map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/10 px-3 py-2 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)] transition hover:border-white/20 hover:text-[var(--color-text)]"
          >
            {item.label}
          </a>
        ))}
      </nav>

      <AnalysisResultDigest result={result} />

      <div className="grid gap-4">
        <UrgentReviewsSection result={result} gates={{ urgentReviewVisibleCount: gates.urgentReviewVisibleCount }} />
        <PriorityMatrixSection result={result} gates={{ showPriorityActionSummary: gates.showPriorityActionSummary }} />
        <RatingSimulationSection result={result} />
        <PositiveKeywordsSection result={result} />
        <ActionItemsSection result={result} gates={{ actionItemVisibleCount: gates.actionItemVisibleCount }} />
      </div>
    </div>
  );
}
