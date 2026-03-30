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
    <div className="inline-flex rounded-[16px] border border-white/10 bg-[rgba(245,239,230,0.03)] p-1" role="tablist" aria-label={t("tabs.ariaLabel")}>
      <button
        id="analysis-tab"
        type="button"
        className={`rounded-[12px] px-4 py-2.5 text-sm transition ${
          activeTab === "analysis" ? "bg-[var(--color-primary)] font-semibold text-white" : "text-[var(--color-muted)]"
        }`}
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
        className={`rounded-[12px] px-4 py-2.5 text-sm transition ${
          activeTab === "results" ? "bg-[var(--color-primary)] font-semibold text-white" : "text-[var(--color-muted)]"
        }`}
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
