import React, { useEffect, useMemo, useRef, useState } from "react";
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
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);
  const summaryCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!result || !summaryCardRef.current) return;
    summaryCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setAnalysisDoneNotice("분석이 완료되었습니다. 핵심 지표와 우선순위 액션을 확인해 보세요.");
  }, [result]);

  const resultsNavItems = useMemo(
    () => [
      { href: "#digest-section", label: "핵심 지표", enabled: true },
      { href: "#urgent-section", label: "긴급 리뷰", enabled: Boolean(result.urgentReviews?.length) },
      { href: "#priority-section", label: "우선순위", enabled: Boolean(result.priorityMatrix?.length) },
      { href: "#simulation-section", label: "시뮬레이션", enabled: Boolean(result.ratingSimulation?.scenarios?.length) },
      { href: "#positive-section", label: "긍정 키워드", enabled: Boolean(result.positiveKeywords?.length) },
      { href: "#action-section", label: "액션 아이템", enabled: Boolean(result.actionItems?.length) }
    ],
    [result.actionItems?.length, result.priorityMatrix?.length, result.positiveKeywords?.length, result.ratingSimulation?.scenarios?.length, result.urgentReviews?.length]
  );

  return (
    <>
      {analysisDoneNotice ? (
        <div className="summaryBanner card">
          <p className="analysisNoticeCardText">{analysisDoneNotice}</p>
        </div>
      ) : null}

      <section ref={summaryCardRef}>
        <AnalysisResultsSummary result={result} onDownloadPdf={onDownloadPdf} busy={busy} caps={caps} gates={gates} />
      </section>

      <nav className="resultsNav" aria-label="결과 섹션 바로가기">
        {resultsNavItems.filter((item) => item.enabled).map((item) => (
          <a href={item.href} className="resultsNavLink" key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <AnalysisResultDigest result={result} />

      <section className="analysisResultsGrid">
        <UrgentReviewsSection result={result} gates={{ urgentReviewVisibleCount: gates.urgentReviewVisibleCount }} />
        <PriorityMatrixSection result={result} gates={{ showPriorityActionSummary: gates.showPriorityActionSummary }} />
        <RatingSimulationSection result={result} />
        <PositiveKeywordsSection result={result} />
        <ActionItemsSection result={result} gates={{ actionItemVisibleCount: gates.actionItemVisibleCount }} />
      </section>
    </>
  );
}
