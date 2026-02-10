import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function AnalysisDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  let supabase: ReturnType<typeof createSupabaseServerComponentClient> | null = null;
  try {
    supabase = createSupabaseServerComponentClient();
  } catch {
    // Supabase not configured.
  }

  if (!supabase) {
    return (
      <main style={{ marginTop: 18 }}>
        <div className="card">
          <h2>저장된 분석 보기</h2>
          <p className="muted">저장 기능이 꺼져 있어 이 페이지를 사용할 수 없습니다.</p>
          <p className="hint muted" style={{ marginTop: 8 }}>
            저장 없이도 대시보드에서 분석 후 <strong>PDF 다운로드</strong>로 공유용 리포트를 만들 수 있어요.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
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
  if (!userData.user) redirect("/login");

  const { data, error } = await supabase
    .from("analyses")
    .select("id, created_at, input_filename, stats, suggestions, priority_score")
    .eq("id", id)
    .single();

  if (error || !data) {
    return (
      <main style={{ marginTop: 18 }}>
        <div className="card">
          <h2>분석을 찾을 수 없음</h2>
          <p className="muted">권한이 없거나 삭제된 항목일 수 있습니다.</p>
          {error ? (
            <p className="hint danger" style={{ whiteSpace: "pre-wrap" }}>
              {error.message}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn" href="/dashboard/history">
              히스토리
            </a>
          </div>
        </div>
      </main>
    );
  }

  const stats: any = data.stats;
  const suggestions: any = data.suggestions;
  const created = new Date(data.created_at).toLocaleString("ko-KR");
  const priorityScore = Number(data.priority_score ?? 0);
  const recent30Share =
    stats?.recentness?.hasDates && typeof stats?.recentness?.last30Share === "number"
      ? `${Math.round(stats.recentness.last30Share * 100)}%`
      : null;

  return (
    <main style={{ marginTop: 18 }}>
      <div className="card">
        <h2>분석 상세</h2>
        <p className="muted">
          {data.input_filename ?? "CSV"} · {created} · 우선순위 {priorityScore.toFixed(1)}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <a className="btn" href="/dashboard/history">
            히스토리
          </a>
          <a className="btn btnPrimary" href="/dashboard">
            새 분석
          </a>
          <a className="btn" href={`/api/report/${data.id}`}>
            PDF 다운로드
          </a>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>핵심 지표</h2>
          <div className="kpiRow">
            <div className="kpi">
              <div className="label">리뷰 수</div>
              <div className="value">{stats?.total ?? "-"}</div>
            </div>
            <div className="kpi">
              <div className="label">부정 비율</div>
              <div className="value" style={{ color: "var(--warn)" }}>
                {typeof stats?.negativeRatio === "number" ? `${Math.round(stats.negativeRatio * 100)}%` : "-"}
              </div>
            </div>
            <div className="kpi">
              <div className="label">평균 별점</div>
              <div className="value">{typeof stats?.avgRating === "number" ? stats.avgRating.toFixed(2) : "-"}</div>
            </div>
            <div className="kpi">
              <div className="label">우선순위 점수</div>
              <div className="value" style={{ color: "var(--accent)" }}>
                {priorityScore.toFixed(1)}
              </div>
            </div>
            <div className="kpi">
              <div className="label">최근 이슈(최근30일 비중)</div>
              <div className="value" style={{ color: "var(--warn)" }}>
                {recent30Share ?? "-"}
              </div>
            </div>
          </div>
          <p className="hint">
            우선순위 점수는 부정 비율(부정/전체), 별점 하락, 문제 카테고리 영향도, 리뷰 수, 최근성(작성일 기준)을 합쳐 “지금
            먼저 손봐야 할 정도”를 0~100으로 만든 값입니다.
          </p>
          {!stats?.recentness?.hasDates ? (
            <p className="hint muted">작성일 컬럼이 없으면 최근성/최근 이슈는 계산되지 않거나 약하게만 반영됩니다.</p>
          ) : null}
        </div>

        <div className="card">
          <h2>부정 키워드 TOP10</h2>
          <div className="list">
            {(stats?.negativeKeywordsTop10 ?? []).map((k: any) => (
              <div className="row" key={k.keyword}>
                <div className="left">
                  <strong>{k.keyword}</strong>
                </div>
                <div className="right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span>{k.count}</span>
                  <CopyButton text={k.keyword} />
                </div>
              </div>
            ))}
          </div>
          {(!stats?.negativeKeywordsTop10 || stats.negativeKeywordsTop10.length === 0) && (
            <p className="muted">키워드가 없습니다.</p>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>문제 카테고리</h2>
          {stats?.categoryCounts && Object.keys(stats.categoryCounts).length > 0 ? (
            <div className="list">
              {Object.entries(stats.categoryCounts as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, count]) => (
                  <div className="row" key={cat}>
                    <div className="left">{cat}</div>
                    <div className="right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{count}</span>
                      <CopyButton text={cat} />
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <p className="muted">카테고리가 없습니다.</p>
          )}
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <h2>개선 제안: 상세페이지</h2>
          <div className="list">
            {(suggestions?.detailPageCopy ?? []).map((s: string, idx: number) => (
              <div className="row" key={idx} style={{ alignItems: "flex-start" }}>
                <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                  {s}
                </div>
                <div className="right">
                  <CopyButton text={s} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h2>개선 제안: CS/FAQ</h2>
          <div className="list">
            {(suggestions?.csResponseTemplates ?? []).map((s: string, idx: number) => (
              <div className="row" key={`cs-${idx}`} style={{ alignItems: "flex-start" }}>
                <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                  {s}
                </div>
                <div className="right">
                  <CopyButton text={s} />
                </div>
              </div>
            ))}
            {(suggestions?.faqRecommendations ?? []).map((s: string, idx: number) => (
              <div className="row" key={`faq-${idx}`} style={{ alignItems: "flex-start" }}>
                <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                  {s}
                </div>
                <div className="right">
                  <CopyButton text={s} />
                </div>
              </div>
            ))}
          </div>
          {(suggestions?.notes ?? []).length > 0 ? (
            <>
              <p className="hint" style={{ marginBottom: 0 }}>
                메모
              </p>
              <div className="list">
                {(suggestions.notes ?? []).map((n: string, i: number) => (
                  <div className="row" key={`note-${i}`} style={{ alignItems: "flex-start" }}>
                    <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                      {n}
                    </div>
                    <div className="right">
                      <CopyButton text={n} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
