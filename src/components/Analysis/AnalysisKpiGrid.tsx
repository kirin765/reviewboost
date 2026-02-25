import React from "react";
import type { AnalysisStats } from "@/lib/types";

export default function AnalysisKpiGrid({ stats, includeRecentness = false }: { stats: AnalysisStats; includeRecentness?: boolean }) {
  const last30 = stats.recentness?.hasDates ? `${Math.round((stats.recentness.last30Share ?? 0) * 100)}%` : null;

  return (
    <div className="kpiRow">
      <div className="kpiCard kpiCardPrimary" aria-label="리뷰 수 지표">
        <div className="label">리뷰 수</div>
        <div className="value">{stats.total}</div>
        <div className="subtext">분석된 총 리뷰 수</div>
      </div>
      <div className="kpiCard kpiCardDanger" aria-label="부정 비율 지표">
        <div className="label">부정 비율</div>
        <div className="value kpiValueDanger">{Math.round(stats.negativeRatio * 100)}%</div>
        <div className="subtext">낮을수록 안정적</div>
      </div>
      <div className="kpiCard kpiCardSuccess" aria-label="평균 별점 지표">
        <div className="label">평균 별점</div>
        <div className="value kpiValueSuccess">{stats.avgRating === null ? "-" : stats.avgRating.toFixed(2)}</div>
        <div className="subtext">/ 5.0</div>
      </div>
      <div className="kpiCard kpiCardWarning" aria-label="우선순위 지표">
        <div className="label">우선순위 점수</div>
        <div className="value kpiValueWarning">{stats.priorityScore.toFixed(1)}</div>
        <div className="subtext">높을수록 긴급</div>
      </div>
      {includeRecentness && last30 ? (
        <div className="kpiCard kpiCardPrimary" aria-label="최근성 지표">
          <div className="label">최근 30일 비중</div>
          <div className="value kpiValuePrimary">{last30}</div>
          <div className="subtext">리뷰의 최근성 반영치</div>
        </div>
      ) : null}
    </div>
  );
}
