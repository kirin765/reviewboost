"use client";

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
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();

  useEffect(() => {
    if (!result || !summaryCardRef.current) return;
    summaryCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setAnalysisDoneNotice(t("results.doneNotice"));
  }, [result, t]);

  const resultsNavItems = useMemo(
    () => [
      { href: "#digest-section", label: t("results.kpi"), enabled: true },
      { href: "#urgent-section", label: t("results.urgentReviews"), enabled: Boolean(result.urgentReviews?.length) },
      { href: "#priority-section", label: t("results.priority"), enabled: Boolean(result.priorityMatrix?.length) },
      { href: "#simulation-section", label: t("results.simulation"), enabled: Boolean(result.ratingSimulation?.scenarios?.length) },
      { href: "#positive-section", label: t("results.positiveKeywords"), enabled: Boolean(result.positiveKeywords?.length) },
      { href: "#action-section", label: t("results.actionItems"), enabled: Boolean(result.actionItems?.length) }
    ],
    [result.actionItems?.length, result.priorityMatrix?.length, result.positiveKeywords?.length, result.ratingSimulation?.scenarios?.length, result.urgentReviews?.length, t]
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

      <nav className="resultsNav" aria-label={t("results.sectionNav")}>
        {resultsNavItems.filter((item) => item.enabled).map((item) => (
          <a href={item.href} className="resultsNavLink" key={item.href}>
            {item.label}
          </a>
        ))}
      </nav>

      <AnalysisResultDigest result={result} />

      <section className="analysisResultsGrid analysisResultsGridSingleColumn">
        <UrgentReviewsSection result={result} gates={{ urgentReviewVisibleCount: gates.urgentReviewVisibleCount }} />
        <PriorityMatrixSection result={result} gates={{ showPriorityActionSummary: gates.showPriorityActionSummary }} />
        <RatingSimulationSection result={result} />
        <PositiveKeywordsSection result={result} />
        <ActionItemsSection result={result} gates={{ actionItemVisibleCount: gates.actionItemVisibleCount }} />
      </section>
    </>
  );
}
