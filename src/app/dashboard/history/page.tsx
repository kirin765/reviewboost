import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnalysisRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number;
  stats: {
    total: number;
    positive?: number;
    negative?: number;
    negativeRatio?: number;
    [key: string]: unknown;
  } | null;
};

export default async function HistoryPage() {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>> | null = null;
  try {
    supabase = await createSupabaseServerComponentClient();
  } catch {
    // Supabase is not configured.
  }

  if (!supabase) {
    return (
      <main className="pageMain dashboardPageSurface">
        <div className="card">
          <h2>저장된 리포트</h2>
          <p className="muted">지금은 저장 기능이 꺼져 있어, 여기에는 목록이 표시되지 않습니다.</p>
          <p className="hint muted">
            대신 대시보드에서 CSV를 분석한 뒤 <strong>PDF 다운로드</strong>로 바로 공유용 리포트를 만들 수 있어요. (저장 없이도 가능)
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
  if (!userData.user) redirect(`/login?next=${encodeURIComponent("/dashboard/history")}`);

  const { data, error } = await supabase
    .from("analyses")
    .select("id, created_at, input_filename, priority_score, stats")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return (
      <main className="pageMain dashboardPageSurface">
        <div className="card">
          <h2>히스토리 로드 실패</h2>
          <p className="hint danger">오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
          <div className="actionRow">
            <a className="btn" href="/dashboard">
              대시보드
            </a>
          </div>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as AnalysisRow[];
  const avgPriority = rows.length ? rows.reduce((sum, row) => sum + Number(row.priority_score ?? 0), 0) / rows.length : 0;
  const latestCreated = rows[0] ? new Date(rows[0].created_at).toLocaleDateString("ko-KR") : "없음";

  return (
    <main className="pageMain dashboardPageSurface">
      <section className="card dashboardPageHeader">
        <div className="dashboardPageHeaderTop">
          <div>
            <p className="sectionEyebrow">Saved reports</p>
            <h1 className="dashboardPageTitle">내 분석 히스토리</h1>
            <p className="dashboardPageLead">최근 50개까지의 저장된 분석을 카드형 목록으로 확인하고 PDF로 다시 내려받을 수 있습니다.</p>
          </div>
          <div className="actionRow">
            <a className="btn btnPrimary" href="/dashboard">
              새 분석
            </a>
          </div>
        </div>

        <div className="dashboardPageStats">
          <article className="dashboardPageStat">
            <span className="dashboardStatLabel">저장된 분석</span>
            <strong className="dashboardStatValue">{rows.length}건</strong>
            <span className="dashboardStatMeta">최근 50개 기준</span>
          </article>
          <article className="dashboardPageStat">
            <span className="dashboardStatLabel">평균 우선순위</span>
            <strong className="dashboardStatValue">{rows.length ? avgPriority.toFixed(1) : "-"}</strong>
            <span className="dashboardStatMeta">저장 리포트 평균</span>
          </article>
          <article className="dashboardPageStat">
            <span className="dashboardStatLabel">최근 저장일</span>
            <strong className="dashboardStatValue">{latestCreated}</strong>
            <span className="dashboardStatMeta">마지막 분석 기록</span>
          </article>
        </div>
      </section>

      <section className="card dashboardListCard">
        <div className="dashboardSubsectionHeader">
          <div>
            <p className="sectionEyebrow">Report list</p>
            <h2>목록</h2>
          </div>
        </div>

        {rows.length === 0 ? (
          <p className="muted">저장된 분석이 없습니다. 먼저 대시보드에서 CSV를 분석해보세요.</p>
        ) : (
          <div className="dashboardList">
            {rows.map((row) => {
              const total = row.stats?.total ?? "-";
              const negativeRatio = typeof row.stats?.negativeRatio === "number" ? `${Math.round(row.stats.negativeRatio * 100)}%` : "-";
              const created = new Date(row.created_at).toLocaleString("ko-KR");
              return (
                <div className="dashboardListRow row" key={row.id}>
                  <div className="left">
                    <div className="rowTitle">{row.input_filename ?? "CSV"}</div>
                    <div className="hint historyMeta dashboardListMeta">{created} · 리뷰 {total} · 부정 {negativeRatio}</div>
                  </div>
                  <div className="rowActions dashboardListActions">
                    <span className="pill">우선순위 {Number(row.priority_score ?? 0).toFixed(1)}</span>
                    <a className="btn" href={`/dashboard/analysis/${row.id}`}>
                      보기
                    </a>
                    <a className="btn" href={`/api/report/${row.id}`}>
                      PDF
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
