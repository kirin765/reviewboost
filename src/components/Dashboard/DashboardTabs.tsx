"use client";

import React from "react";
import { cn } from "@/lib/cn";
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
    <div className="inline-flex rounded-[16px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-1" role="tablist" aria-label={t("tabs.ariaLabel")}>
      {([
        ["analysis", t("tabs.analysis")],
        ["results", t("tabs.results")]
      ] as const).map(([tab, label]) => (
        <button
          key={tab}
          id={`${tab}-tab`}
          type="button"
          className={cn(
            "rounded-[12px] px-4 py-2.5 text-sm font-medium transition",
            activeTab === tab ? "bg-[var(--rb-accent)] text-[#071112]" : "text-[var(--rb-muted-strong)] hover:text-[var(--rb-fg)]"
          )}
          role="tab"
          aria-selected={activeTab === tab}
          aria-controls={`${tab}-panel`}
          tabIndex={activeTab === tab ? 0 : -1}
          onKeyDown={onKeyDown}
          onClick={() => onChange(tab)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
