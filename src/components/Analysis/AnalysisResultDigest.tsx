"use client";

import type { AnalysisOutput } from "@/lib/types";
import type { ReactNode } from "react";

function SectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-[20px] border border-white/[0.08] bg-[linear-gradient(160deg,rgba(18,22,32,0.96),rgba(10,13,20,0.98))] p-5 shadow-[0_16px_48px_rgba(0,0,0,0.24)]">
      <h3 className="text-[10.5px] font-semibold uppercase tracking-[0.26em] text-[var(--color-text-tertiary)]">{title}</h3>
      {children}
    </section>
  );
}

function MetricItem({ label, value, sub, color = "#4f7fff" }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="group relative overflow-hidden rounded-[16px] border border-white/[0.07] bg-white/[0.025] p-4 transition-all hover:border-white/[0.12]">
      <div className="absolute inset-0 opacity-0 transition group-hover:opacity-100" style={{ background: `radial-gradient(circle at 20% 20%, ${color}0d, transparent 60%)` }} />
      <div className="relative">
        <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-muted)]">{label}</div>
        <div className="mt-2 text-[2rem] font-semibold tracking-[-0.05em]" style={{ color }}>{value}</div>
        {sub && <div className="mt-1 text-xs text-[var(--color-text-tertiary)]">{sub}</div>}
      </div>
    </div>
  );
}

export default function AnalysisResultDigest({ result }: { result: Pick<AnalysisOutput, "stats" | "suggestions"> }) {
  const keywords = result.stats.negativeKeywordsTop10 ?? [];
  const categories = Object.entries(result.stats.categoryCounts ?? {}).sort((a, b) => b[1] - a[1]);
  const notes = result.suggestions?.notes ?? [];

  const negRatio = Math.round((result.stats.negativeRatio ?? 0) * 100);
  const avgRating = result.stats.avgRating;
  const priorityScore = result.stats.priorityScore;

  const negColor = negRatio >= 40 ? "#f87171" : negRatio >= 20 ? "#f2c94c" : "#34d399";
  const ratingColor = avgRating !== null && avgRating < 3.5 ? "#f2c94c" : "#34d399";
  const priorityColor = priorityScore >= 70 ? "#f87171" : priorityScore >= 45 ? "#f2c94c" : "#4f7fff";

  const maxKeywordCount = keywords.length > 0 ? Math.max(...keywords.map((k) => (k as { count: number }).count)) : 1;
  const totalCategoryCount = categories.reduce((s, [, c]) => s + c, 0) || 1;

  return (
    <section id="digest-section" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        {/* Key metrics */}
        <SectionCard title="Key metrics">
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <MetricItem label="Negative rate" value={`${negRatio}%`} sub="부정 비율" color={negColor} />
            <MetricItem
              label="Avg rating"
              value={avgRating === null ? "—" : avgRating.toFixed(2)}
              sub="평균 평점"
              color={ratingColor}
            />
            <MetricItem label="Priority score" value={priorityScore.toFixed(1)} sub="우선순위 점수" color={priorityColor} />
          </div>
        </SectionCard>

        {/* Keywords */}
        <SectionCard title="키워드 TOP 10">
          <div className="mt-4 space-y-2.5">
            {keywords.map((item, index) => {
              const keyword = item as { keyword: string; count: number };
              const barWidth = Math.round((keyword.count / maxKeywordCount) * 100);
              const opacity = Math.max(0.35, 1 - index * 0.08);
              return (
                <div key={`${keyword.keyword}-${index}`} className="group flex items-center gap-3">
                  <span className="w-4 text-right font-mono text-[10px] text-[var(--color-text-tertiary)]">{index + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--color-text)]">{keyword.keyword}</span>
                      <span className="font-mono text-xs text-[var(--color-muted)]">{keyword.count}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${barWidth}%`,
                          background: `linear-gradient(90deg, #4f7fff, #6366f1)`,
                          opacity
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            {keywords.length === 0 && (
              <p className="mt-3 text-sm text-[var(--color-muted)]">추출된 부정 키워드가 없습니다.</p>
            )}
          </div>
        </SectionCard>
      </div>

      <div className="space-y-4">
        {/* Categories */}
        <SectionCard title="카테고리 분포">
          <div className="mt-4 space-y-3">
            {categories.map(([category, count], index) => {
              const pct = Math.round((count / totalCategoryCount) * 100);
              const colors = ["#4f7fff", "#6366f1", "#8b5cf6", "#a78bfa", "#34d399", "#f2c94c"];
              const color = colors[index % colors.length];
              return (
                <div key={category} className="flex items-center gap-3">
                  <div className="w-14 text-right text-sm font-medium" style={{ color }}>{category}</div>
                  <div className="flex-1">
                    <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                  <span className="w-10 text-right font-mono text-xs text-[var(--color-muted)]">{pct}%</span>
                </div>
              );
            })}
            {categories.length === 0 && (
              <p className="mt-3 text-sm text-[var(--color-muted)]">카테고리 데이터가 없습니다.</p>
            )}
          </div>
        </SectionCard>

        {/* Notes */}
        <SectionCard title="메모">
          <div className="mt-4 space-y-2.5">
            {(notes.length ? notes : ["추가 메모가 없습니다."]).map((item, index) => (
              <div key={`note-${index}`} className="flex gap-2.5">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-primary)] opacity-60" />
                <p className="text-sm leading-[1.8] text-[var(--color-muted)]">{String(item)}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </section>
  );
}
