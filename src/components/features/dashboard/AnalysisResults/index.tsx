import React, { useEffect, useRef, useState } from "react";
import type { AnalysisOutput, PlanGates } from "@/lib/types";
import type { Capabilities } from "@/lib/capabilities";
import AnalysisResultDigest from "@/components/Analysis/AnalysisResultDigest";
import { useGates } from "@/contexts/PlanContext";
import {
  ActionItemsSection,
  AnalysisResultsSummary,
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
    setAnalysisDoneNotice("분석이 완료되었습니다. 핵심 지표를 확인해 보세요.");
  }, [result]);

  return (
    <>
      {analysisDoneNotice ? (
        <div className="summaryBanner">
          <p className="analysisNoticeCardText">{analysisDoneNotice}</p>
        </div>
      ) : null}

      <section ref={summaryCardRef}>
        <AnalysisResultsSummary result={result} onDownloadPdf={onDownloadPdf} busy={busy} caps={caps} gates={gates} />
      </section>

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
