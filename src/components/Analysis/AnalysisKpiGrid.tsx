"use client";

import React from "react";
import type { AnalysisStats } from "@/lib/types";
import { useTranslation } from "@/lib/i18n";

export default function AnalysisKpiGrid({ stats, includeRecentness = false }: { stats: AnalysisStats; includeRecentness?: boolean }) {
  const { t } = useTranslation();
  const last30 = stats.recentness?.hasDates ? `${Math.round((stats.recentness.last30Share ?? 0) * 100)}%` : null;

  return (
    <div className="kpiRow kpiRowSingleColumn">
      <div className="kpiCard kpiCardPrimary" aria-label={t("kpi.reviewCount")}>
        <div className="label">{t("kpi.reviewCount")}</div>
        <div className="value">{stats.total}</div>
        <div className="subtext">{t("kpi.totalReviews")}</div>
      </div>
      <div className="kpiCard kpiCardDanger" aria-label={t("kpi.negativeRatio")}>
        <div className="label">{t("kpi.negativeRatio")}</div>
        <div className="value">{Math.round(stats.negativeRatio * 100)}%</div>
        <div className="subtext">{t("kpi.lowerIsBetter")}</div>
      </div>
      <div className="kpiCard kpiCardSuccess" aria-label={t("kpi.avgRating")}>
        <div className="label">{t("kpi.avgRating")}</div>
        <div className="value">{stats.avgRating === null ? "-" : stats.avgRating.toFixed(2)}</div>
        <div className="subtext">/ 5.0</div>
      </div>
      <div className="kpiCard kpiCardWarning" aria-label={t("kpi.priorityScore")}>
        <div className="label">{t("kpi.priorityScore")}</div>
        <div className="value">{stats.priorityScore.toFixed(1)}</div>
        <div className="subtext">{t("kpi.higherIsUrgent")}</div>
      </div>
      {includeRecentness && last30 ? (
        <div className="kpiCard kpiCardPrimary" aria-label={t("kpi.recent30")}>
          <div className="label">{t("kpi.recent30")}</div>
          <div className="value">{last30}</div>
          <div className="subtext">{t("kpi.recencyReflected")}</div>
        </div>
      ) : null}
    </div>
  );
}
