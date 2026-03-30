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
    <div className="grid gap-3 xl:grid-cols-4" role="list" aria-label={t("steps.ariaLabel")}>
      {steps.map((item) => {
        const isDone = step > item.n;
        const isCurrent = step === item.n;
        return (
          <div
            key={item.n}
            className={cn(
              "rounded-[16px] border px-4 py-4 transition",
              isCurrent
                ? "border-[color:rgba(95,198,183,0.28)] bg-[rgba(95,198,183,0.08)]"
                : isDone
                  ? "border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)]"
                  : "border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)]"
            )}
            role="listitem"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] text-sm font-semibold text-[var(--rb-fg)]">
                {isDone ? "\u2713" : item.n}
              </span>
              <div>
                <span className="block text-sm font-medium text-[var(--rb-fg)]">{t(item.labelKey)}</span>
                <span className="block text-xs text-[var(--rb-muted)]">{t(item.descKey)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
