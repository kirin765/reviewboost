"use client";

import React from "react";
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
    <div className="stepper" role="list" aria-label={t("steps.ariaLabel")}>
      {steps.map((item, idx) => {
        const isDone = step > item.n;
        const isCurrent = step === item.n;
        return (
          <React.Fragment key={item.n}>
            {idx > 0 ? (
              <div className={`stepConnector ${step > item.n ? "stepConnectorDone" : step === item.n ? "stepConnectorActive" : ""}`} aria-hidden="true" />
            ) : null}
            <div
              className={`step ${isDone ? "completed" : ""} ${isCurrent ? "active" : ""}`}
              role="listitem"
            >
              <span className="stepNumber">{isDone ? "\u2713" : item.n}</span>
              <span className="stepBody">
                <span className="stepTitle">{t(item.labelKey)}</span>
                <span className="stepDesc">{t(item.descKey)}</span>
              </span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
