"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";

export type DashboardTab = "analysis" | "results";

export default function DashboardTabs({
  activeTab,
  onChange
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  const { t } = useTranslation();

  function onKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    const isNext = event.key === "ArrowRight" || event.key === "ArrowDown";
    const isPrev = event.key === "ArrowLeft" || event.key === "ArrowUp";
    const isHome = event.key === "Home";
    const isEnd = event.key === "End";

    if (!isNext && !isPrev && !isHome && !isEnd) return;

    event.preventDefault();

    if (isHome || (isPrev && activeTab === "results")) {
      onChange("analysis");
      return;
    }

    if (isEnd || (isNext && activeTab === "analysis")) {
      onChange("results");
    }
  }

  return (
    <div className="dashboardTabs" role="tablist" aria-label={t("tabs.ariaLabel")}>
      <button
        id="analysis-tab"
        type="button"
        className={`dashboardTab ${activeTab === "analysis" ? "isActive" : ""}`}
        role="tab"
        aria-selected={activeTab === "analysis"}
        aria-controls="analysis-panel"
        tabIndex={activeTab === "analysis" ? 0 : -1}
        onKeyDown={onKeyDown}
        onClick={() => onChange("analysis")}
      >
        {t("tabs.analysis")}
      </button>
      <button
        id="results-tab"
        type="button"
        className={`dashboardTab ${activeTab === "results" ? "isActive" : ""}`}
        role="tab"
        aria-selected={activeTab === "results"}
        aria-controls="results-panel"
        tabIndex={activeTab === "results" ? 0 : -1}
        onKeyDown={onKeyDown}
        onClick={() => onChange("results")}
      >
        {t("tabs.results")}
      </button>
    </div>
  );
}
