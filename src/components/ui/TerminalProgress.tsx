"use client";

import React from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/cn";
import { ANALYSIS_STAGE_META, ANALYSIS_STAGE_ORDER, type AnalysisStage } from "@/lib/analysis-stage";

export default function TerminalProgress({
  stage,
  className
}: {
  stage: AnalysisStage;
  className?: string;
}) {
  const reducedMotion = useReducedMotion();
  const visibleStages = ANALYSIS_STAGE_ORDER.filter((item) => ANALYSIS_STAGE_ORDER.indexOf(item) <= ANALYSIS_STAGE_ORDER.indexOf(stage === "done" ? "priority" : stage));
  const currentStage = stage === "done" ? "priority" : stage;
  const progress = stage === "done" ? 100 : ANALYSIS_STAGE_META[currentStage].progress;

  return (
    <section
      className={cn(
        "rounded-2xl border border-[color:var(--rb-border-strong)] bg-[rgba(6,10,11,0.92)] p-5 shadow-[0_24px_50px_rgba(0,0,0,0.32)]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">분석 진행 상황</p>
          <h3 className="mt-2 text-lg font-semibold text-[var(--rb-fg)]">분석을 차례대로 진행하고 있어요</h3>
        </div>
        <span className="rounded-full border border-[color:rgba(95,198,183,0.24)] bg-[rgba(95,198,183,0.08)] px-3 py-1 text-[11px] font-medium text-[var(--rb-accent)]">
          리뷰 수에 따라 최대 5분 정도 걸릴 수 있어요.
        </span>
      </div>

      <div className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 font-mono text-sm">
        {visibleStages.map((item) => (
          <div key={item} className="flex items-start gap-3 py-1 text-[var(--rb-fg)]">
            <span className="mt-[3px] h-2 w-2 rounded-full bg-[var(--rb-accent)]" />
            <span className={item === currentStage ? "text-[var(--rb-fg)]" : "text-[var(--rb-muted)]"}>{ANALYSIS_STAGE_META[item].label}</span>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between text-xs text-[var(--rb-muted)]">
          <span>{ANALYSIS_STAGE_META[currentStage].label}</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
          {reducedMotion ? (
            <div className="h-full rounded-full bg-[var(--rb-accent)]" style={{ width: `${progress}%` }} />
          ) : (
            <motion.div
              className="h-full rounded-full bg-[var(--rb-accent)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          )}
        </div>
      </div>
    </section>
  );
}
