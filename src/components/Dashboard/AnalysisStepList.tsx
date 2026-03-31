"use client";

import React from "react";
import { cn } from "@/lib/cn";
import { useTranslation } from "@/lib/i18n";

type AnalysisStepperProps = {
  step: 1 | 2 | 3 | 4;
};

export default function AnalysisStepList({ step }: AnalysisStepperProps) {
  const { t } = useTranslation();

  const steps: Array<{ n: 1 | 2 | 3 | 4; labelKey: string; descKey: string }> = [
    { n: 1, labelKey: "steps.fileSelect", descKey: "steps.fileSelectDesc" },
    { n: 2, labelKey: "steps.columnMapping", descKey: "steps.columnMappingDesc" },
    { n: 3, labelKey: "steps.analyzing", descKey: "steps.analyzingDesc" },
    { n: 4, labelKey: "steps.results", descKey: "steps.resultsDesc" }
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-4" role="list" aria-label={t("steps.ariaLabel")}>
      {steps.map((item) => {
        const isActive = step >= item.n;
        return (
          <div
            key={item.n}
            className="rounded-[18px] border border-[color:rgba(222,230,242,0.08)] bg-[rgba(255,255,255,0.02)] px-4 py-4"
            role="listitem"
          >
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full border",
                  isActive
                    ? "border-[color:rgba(107,210,193,0.5)] bg-[var(--rb-accent)] shadow-[0_0_18px_rgba(107,210,193,0.35)]"
                    : "border-[color:rgba(222,230,242,0.14)] bg-[rgba(255,255,255,0.04)]"
                )}
                aria-hidden="true"
              >
                <span className={cn("h-2 w-2 rounded-full", isActive ? "bg-[#081110]" : "bg-[rgba(222,230,242,0.32)]")} />
              </span>
              <div>
                <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--rb-muted)]">0{item.n}</span>
                <span className="mt-2 block text-sm font-medium text-[var(--rb-fg)]">{t(item.labelKey)}</span>
                <span className="block text-xs text-[var(--rb-muted)]">{t(item.descKey)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
