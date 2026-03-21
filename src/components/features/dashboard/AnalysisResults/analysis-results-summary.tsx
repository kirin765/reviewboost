"use client";

import React from "react";
import type { AnalysisOutput } from "@/lib/types";
import type { Capabilities } from "@/lib/capabilities";
import type { PlanGates } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

type AnalysisResultsSummaryProps = {
  result: AnalysisOutput & {
    meta: {
      filename: string | null;
      stored: boolean;
      analysisId?: string;
      truncated?: boolean;
    };
  };
  onDownloadPdf: () => void;
  busy: boolean;
  caps: Capabilities | null;
  gates: PlanGates;
};

export function AnalysisResultsSummary({ result, onDownloadPdf, busy, caps, gates }: AnalysisResultsSummaryProps) {
  const { t } = useTranslation();
  const storageEnabled = caps?.supabaseConfigured === true;
  const storageLinkLabel = storageEnabled ? t("summary.viewSavedReports") : t("summary.storageDisabled");
  const negativeRatio = typeof result.stats.negativeRatio === "number" ? `${Math.round(result.stats.negativeRatio * 100)}%` : "-";
  const avgRating = result.stats.avgRating === null ? t("summary.notProvided") : `${result.stats.avgRating.toFixed(1)}${t("summary.points")}`;
  const recentShare = result.stats.recentness?.hasDates ? `${Math.round((result.stats.recentness.last30Share ?? 0) * 100)}%` : t("summary.noDate");
  const summaryStats = [
    { label: t("summary.totalReviews"), value: `${result.stats.total}${t("summary.count")}`, meta: result.meta.filename ?? t("summary.uploadFile") },
    { label: t("summary.negativeRatio"), value: negativeRatio, meta: t("summary.negativeCount", { count: result.stats.negative ?? 0 }) },
    { label: t("summary.avgRating"), value: avgRating, meta: t("summary.ratingCalcHint") },
    { label: t("summary.recent30"), value: recentShare, meta: result.stats.recentness?.hasDates ? t("summary.recencyReflected") : t("summary.noDateCol") }
  ];

  return (
    <section className="resultsBlock analysisResultsPrimary resultsHeroCard">
      {result.meta.truncated ? (
        <p className="hint danger analysisResultsWarning">
          {t("summary.truncatedWarning", { count: gates.maxReviewsPerAnalysis })}
        </p>
      ) : null}

      {!result.stats.recentness?.hasDates ? (
        <p className="hint muted analysisResultsHintMuted">{t("summary.noDateHint")}</p>
      ) : null}

      <div className="resultsHeroHead">
        <div className="resultsHeroIntro">
          <p className="sectionEyebrow">{t("summary.eyebrow")}</p>
          <h1 className="resultsHeroTitle">{t("summary.title")}</h1>
          <p className="resultsHeroLead">{t("summary.lead")}</p>
          <div className="resultsHeroMetaRow">
            <span className="pill pillActive">{result.meta.filename ?? "CSV"}</span>
            <span className="pill">{result.meta.stored ? t("summary.savedComplete") : t("summary.sessionResult")}</span>
            <span className="pill">{storageEnabled ? caps?.planLabel ?? t("summary.account") : t("summary.guestMode")}</span>
          </div>
        </div>
        <div className="toolbar resultsToolbar">
          <button className="btn btnPrimary" onClick={onDownloadPdf} disabled={busy}>
            {t("common.downloadPdf")}
          </button>
          <a
            className="btn"
            href="/dashboard/history"
            onClick={(event) => {
              if (!storageEnabled) event.preventDefault();
            }}
          >
            {storageLinkLabel}
          </a>
        </div>
      </div>

      <div className="resultsHeroStats resultsHeroStatsSingleColumn">
        {summaryStats.map((stat) => (
          <article className="resultsHeroStat" key={stat.label}>
            <span className="resultsHeroStatLabel">{stat.label}</span>
            <strong className="resultsHeroStatValue">{stat.value}</strong>
            <span className="resultsHeroStatMeta">{stat.meta}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
