"use client";

import type { AnalysisOutput } from "@/lib/types";
import type { ReactNode } from "react";

function ListBlock({
  title,
  items,
  formatter
}: {
  title: string;
  items: unknown[];
  formatter: (item: unknown, index: number) => ReactNode;
}) {
  return (
    <section className="rounded-[20px] border border-white/10 bg-[rgba(245,239,230,0.03)] p-5">
      <h3 className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">{title}</h3>
      <div className="mt-4 space-y-3">{items.map(formatter)}</div>
    </section>
  );
}

export default function AnalysisResultDigest({ result }: { result: Pick<AnalysisOutput, "stats" | "suggestions"> }) {
  const keywords = result.stats.negativeKeywordsTop10 ?? [];
  const categories = Object.entries(result.stats.categoryCounts ?? {}).sort((a, b) => b[1] - a[1]);
  const notes = result.suggestions?.notes ?? [];

  return (
    <section id="digest-section" className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="space-y-4">
        <div className="rounded-[20px] border border-white/10 bg-[rgba(245,239,230,0.03)] p-5">
          <div className="text-[11px] uppercase tracking-[0.28em] text-[var(--color-muted)]">Key metrics</div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Negative rate</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--color-text)]">
                {Math.round((result.stats.negativeRatio ?? 0) * 100)}%
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Avg rating</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--color-text)]">
                {result.stats.avgRating === null ? "-" : result.stats.avgRating.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">Priority score</div>
              <div className="mt-2 text-3xl font-semibold text-[var(--color-text)]">{result.stats.priorityScore.toFixed(1)}</div>
            </div>
          </div>
        </div>

        <ListBlock
          title="키워드"
          items={keywords}
          formatter={(item, index) => {
            const keyword = item as { keyword: string; count: number };
            return (
              <div key={`${keyword.keyword}-${index}`} className="flex items-center justify-between border-t border-white/8 pt-3 text-sm">
                <span className="text-[var(--color-text)]">{keyword.keyword}</span>
                <span className="text-[var(--color-muted)]">{keyword.count}</span>
              </div>
            );
          }}
        />
      </div>

      <div className="space-y-4">
        <ListBlock
          title="카테고리"
          items={categories}
          formatter={(item, index) => {
            const [category, count] = item as [string, number];
            return (
              <div key={`${category}-${index}`} className="flex items-center justify-between border-t border-white/8 pt-3 text-sm">
                <span className="text-[var(--color-text)]">{category}</span>
                <span className="text-[var(--color-muted)]">{count}</span>
              </div>
            );
          }}
        />

        <ListBlock
          title="메모"
          items={notes.length ? notes : ["추가 메모가 없습니다."]}
          formatter={(item, index) => (
            <div key={`note-${index}`} className="border-t border-white/8 pt-3 text-sm leading-7 text-[var(--color-muted)]">
              {String(item)}
            </div>
          )}
        />
      </div>
    </section>
  );
}
