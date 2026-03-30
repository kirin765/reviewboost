import React from "react";
import { redirect } from "next/navigation";
import { buttonStyles } from "@/components/ui/Button";
import { SectionHeader, StatePanel, Surface } from "@/components/ui/Primitives";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { AnalysisOutput } from "@/lib/types";

export const dynamic = "force-dynamic";

type AnalysisRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number;
  stats: AnalysisOutput["stats"] | null;
  suggestions: AnalysisOutput["suggestions"] | null;
};

const EMPTY_ANALYSIS_RESULT: Pick<AnalysisOutput, "stats" | "suggestions"> = {
  stats: {
    total: 0,
    positive: 0,
    negative: 0,
    neutral: 0,
    positiveRatio: 0,
    negativeRatio: 0,
    avgRating: null,
    negativeKeywordsTop10: [],
    categoryCounts: {} as AnalysisOutput["stats"]["categoryCounts"],
    priorityScore: 0,
    recentness: {
      hasDates: false,
      last30Share: 0,
      last90Share: 0,
      last30NegativeRatio: null
    }
  },
  suggestions: {
    detailPageCopy: [],
    csResponseTemplates: [],
    faqRecommendations: [],
    notes: []
  }
};

export default async function AnalysisDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>> | null = null;
  try {
    supabase = await createSupabaseServerComponentClient();
  } catch {
    // Supabase not configured.
  }

  if (!supabase) {
    return (
      <main className="pageMain">
        <StatePanel
          title="저장 기능이 비활성화되어 있습니다"
          description="지금은 저장 기능이 꺼져 있어 이 페이지를 사용할 수 없습니다. 대시보드에서 분석 후 PDF를 바로 공유용 리포트로 사용할 수 있습니다."
          actions={
            <>
              <a className={buttonStyles({ variant: "primary" })} href="/dashboard">새 분석</a>
              <a className={buttonStyles({ variant: "secondary" })} href="/help">사용법</a>
            </>
          }
        />
      </main>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=${encodeURIComponent(`/dashboard/analysis/${id}`)}`);

  const { data, error } = await supabase
    .from("analyses")
    .select("id, created_at, input_filename, stats, suggestions, priority_score")
    .eq("id", id)
    .eq("user_id", userData.user.id)
    .single();

  if (error || !data) {
    return (
      <main className="pageMain">
        <StatePanel
          title="문제가 발생했어요"
          description="분석을 찾을 수 없거나 접근 권한이 없습니다."
          tone="error"
          actions={<a className={buttonStyles({ variant: "secondary" })} href="/dashboard/history">히스토리</a>}
        />
      </main>
    );
  }

  const row = data as AnalysisRow;
  const created = new Date(row.created_at).toLocaleString("ko-KR");
  const priorityScore = Number(row.priority_score ?? 0);

  const result: Pick<AnalysisOutput, "stats" | "suggestions"> = {
    stats: row.stats ?? EMPTY_ANALYSIS_RESULT.stats,
    suggestions: row.suggestions ?? EMPTY_ANALYSIS_RESULT.suggestions
  };

  const summaryStats = [
    { label: "총 리뷰", value: `${result.stats.total}건`, meta: row.input_filename ?? "CSV" },
    {
      label: "부정 비율",
      value: `${Math.round((result.stats.negativeRatio ?? 0) * 100)}%`,
      meta: `부정 ${result.stats.negative ?? 0}건`
    },
    {
      label: "평균 별점",
      value: result.stats.avgRating === null ? "미기재" : `${result.stats.avgRating.toFixed(1)}점`,
      meta: "별점 열이 있을 때 계산"
    }
  ];

  return (
    <main className="pageMain space-y-6">
      <Surface className="px-6 py-6 md:px-7">
        <SectionHeader
          eyebrow="Saved report"
          title={row.input_filename ?? "저장된 분석"}
          description={`${created} · 우선순위 ${priorityScore.toFixed(1)}`}
          action={
            <div className="flex flex-wrap gap-3">
              <a className={buttonStyles({ variant: "secondary" })} href="/dashboard/history">히스토리</a>
              <a className={buttonStyles({ variant: "primary" })} href="/dashboard">새 분석</a>
              <a className={buttonStyles({ variant: "secondary" })} href={`/api/report/${row.id}`}>PDF 다운로드</a>
            </div>
          }
        />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {summaryStats.map((stat) => (
            <div key={stat.label} className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="text-xs text-[var(--rb-muted)]">{stat.label}</p>
              <strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{stat.value}</strong>
              <p className="mt-2 text-sm text-[var(--rb-muted-strong)]">{stat.meta}</p>
            </div>
          ))}
        </div>
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <SectionHeader eyebrow="Digest" title="핵심 요약" description="저장 시점의 통계와 제안 문구를 다시 확인합니다." />
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Negative keywords</p>
            <div className="mt-4 space-y-3">
              {result.stats.negativeKeywordsTop10.map((item) => (
                <div key={item.keyword} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-[var(--rb-fg)]">{item.keyword}</span>
                  <span className="text-[var(--rb-muted)]">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Suggestions</p>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
              {result.suggestions.detailPageCopy.map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
              {result.suggestions.csResponseTemplates.map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
              {result.suggestions.faqRecommendations.map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
              {result.suggestions.notes.map((item, index) => (
                <p key={`${item}-${index}`}>{item}</p>
              ))}
            </div>
          </div>
        </div>
      </Surface>
    </main>
  );
}
