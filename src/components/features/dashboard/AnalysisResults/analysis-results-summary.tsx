"use client";

import type { AnalysisOutput } from "@/lib/types";
import type { Capabilities } from "@/lib/capabilities";
import type { PlanGates } from "@/lib/types";

type AnalysisResultsSummaryProps = {
  result: AnalysisOutput & {
    meta: {
      filename: string | null;
      stored: boolean;
      analysisId?: string;
      truncated?: boolean;
    };
  };
  onDownloadPdf: () => void;
  busy: boolean;
  caps: Capabilities | null;
  gates: PlanGates;
};

export function AnalysisResultsSummary({ result, onDownloadPdf, busy, caps, gates }: AnalysisResultsSummaryProps) {
  const negativeRatio = typeof result.stats.negativeRatio === "number" ? `${Math.round(result.stats.negativeRatio * 100)}%` : "-";
  const avgRating = result.stats.avgRating === null ? "-" : `${result.stats.avgRating.toFixed(2)} / 5`;
  const recentShare = result.stats.recentness?.hasDates ? `${Math.round((result.stats.recentness.last30Share ?? 0) * 100)}%` : "-";
  const summaryStats = [
    ["총 리뷰 수", String(result.stats.total)],
    ["부정 비율", negativeRatio],
    ["평균 평점", avgRating],
    ["최근 가중치", recentShare]
  ];

  return (
    <section className="space-y-5 rounded-[24px] border border-white/10 bg-[rgba(17,20,23,0.92)] p-6 md:p-8">
      {result.meta.truncated ? (
        <div className="rounded-[16px] border border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] px-4 py-3 text-sm text-[var(--color-text)]/90">
          분석 가능한 최대 리뷰 수 {gates.maxReviewsPerAnalysis}개를 초과해 일부만 반영했습니다.
        </div>
      ) : null}

      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">Analysis result</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text)] md:text-5xl">무엇이 가장 급하고, 무엇부터 고쳐야 하는지 정리했습니다.</h1>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">
            긴급 리뷰, 카테고리별 영향도, 실행 우선순위, 평점 개선 시뮬레이션까지 하나의 분석 흐름으로 제공합니다.
          </p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
            <span className="rounded-full border border-white/10 px-3 py-1.5">{result.meta.filename ?? "CSV"}</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">{result.meta.stored ? "saved" : "session only"}</span>
            <span className="rounded-full border border-white/10 px-3 py-1.5">{caps?.planLabel ?? "Guest mode"}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-[14px] bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onDownloadPdf}
            disabled={busy}
          >
            PDF 다운로드
          </button>
          <a
            className="inline-flex items-center justify-center rounded-[14px] border border-white/10 bg-white/5 px-5 py-3 text-sm text-[var(--color-text)]"
            href="/dashboard/history"
          >
            저장된 리포트
          </a>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {summaryStats.map(([label, value]) => (
          <div key={label} className="border-t border-white/10 pt-4">
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">{label}</div>
            <div className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--color-text)]">{value}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
