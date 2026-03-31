"use client";

import React from "react";
import { cn } from "@/lib/cn";

type AnalysisStepperProps = {
  step: 1 | 2 | 3 | 4;
};

export default function AnalysisStepList({ step }: AnalysisStepperProps) {
  const steps: Array<{ n: 1 | 2 | 3 | 4; label: string; description: string }> = [
    { n: 1, label: "파일 선택", description: "CSV 업로드" },
    { n: 2, label: "열 확인", description: "리뷰·별점·작성일" },
    { n: 3, label: "분석 진행", description: "AI 분류·우선순위 계산" },
    { n: 4, label: "결과 확인", description: "긴급 리뷰·액션 확인" }
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-4" role="list" aria-label="분석 단계">
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
                <span className="block text-[11px] uppercase tracking-[0.18em] text-[var(--rb-muted)]">{item.n}단계</span>
                <span className="mt-2 block text-sm font-medium text-[var(--rb-fg)]">{item.label}</span>
                <span className="block text-xs text-[var(--rb-muted)]">{item.description}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
