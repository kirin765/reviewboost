import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { AnalysisOutput } from "@/lib/types";
import AnalysisResultDigest from "@/components/Analysis/AnalysisResultDigest";

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
      <main className="pageMain dashboardPageSurface">
        <div className="card">
          <h2>저장된 분석 보기</h2>
          <p className="muted">저장 기능이 꺼져 있어 이 페이지를 사용할 수 없습니다.</p>
          <p className="hint muted">
            저장 없이도 대시보드에서 분석 후 <strong>PDF 다운로드</strong>로 공유용 리포트를 만들 수 있어요.
          </p>
          <div className="actionRow">
            <a className="btn btnPrimary" href="/dashboard">
              새 분석
            </a>
            <a className="btn" href="/help">
              사용법
            </a>
          </div>
        </div>
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
      <main className="pageMain dashboardPageSurface">
        <div className="card">
          <h2>분석을 찾을 수 없음</h2>
          <p className="muted">권한이 없거나 삭제된 항목일 수 있습니다.</p>
          {error ? <p className="hint danger">오류가 발생했습니다.</p> : null}
          <div className="actionRow">
            <a className="btn" href="/dashboard/history">
              히스토리
            </a>
          </div>
        </div>
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
    <main className="pageMain workspacePage">
      <section className="card">
        <div className="appPageHeader">
          <div>
            <p className="sectionEyebrow">Saved report</p>
            <h1 className="appPageTitle">저장된 분석</h1>
            <p className="appPageLead">
              {row.input_filename ?? "CSV"} · {created} · 우선순위 {priorityScore.toFixed(1)}
            </p>
          </div>
          <div className="appPageActions">
            <a className="btn" href="/dashboard/history">
              히스토리
            </a>
            <a className="btn btnPrimary" href="/dashboard">
              새 분석
            </a>
            <a className="btn" href={`/api/report/${row.id}`}>
              PDF 다운로드
            </a>
          </div>
        </div>

        <div className="appPageMetaGrid">
          {summaryStats.map((stat) => (
            <article className="appPageMetaItem" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p className="hint">{stat.meta}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboardDetailSection">
        <AnalysisResultDigest result={result} />
      </section>
    </main>
  );
}
