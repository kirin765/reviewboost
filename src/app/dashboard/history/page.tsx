import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type AnalysisRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number;
  stats: any;
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
      <main className="pageMain">
        <div className="card">
          <h2>저장된 리포트</h2>
          <p className="muted">지금은 저장 기능이 꺼져 있어, 여기에는 목록이 표시되지 않습니다.</p>
          <p className="hint muted" style={{ marginTop: 8 }}>
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
      <main className="pageMain">
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

  return (
    <main className="pageMain">
      <div className="card">
        <h2>내 분석 히스토리</h2>
        <p className="muted">최근 50개까지 표시합니다.</p>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            새 분석
          </a>
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <h2>목록</h2>
        {rows.length === 0 ? (
          <p className="muted">저장된 분석이 없습니다. 먼저 대시보드에서 CSV를 분석해보세요.</p>
        ) : (
          <div className="list">
            {rows.map((r) => {
              const total = r.stats?.total ?? "-";
              const neg = typeof r.stats?.negativeRatio === "number" ? `${Math.round(r.stats.negativeRatio * 100)}%` : "-";
              const created = new Date(r.created_at).toLocaleString("ko-KR");
              return (
                <div className="row" key={r.id} style={{ alignItems: "center" }}>
                  <div className="left" style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis" }}>
                      {r.input_filename ?? "CSV"}
                    </div>
                    <div className="hint" style={{ marginTop: 6 }}>
                      {created} · 리뷰 {total} · 부정 {neg}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <span className="pill">우선순위 {Number(r.priority_score ?? 0).toFixed(1)}</span>
                    <a className="btn" href={`/dashboard/analysis/${r.id}`}>
                      보기
                    </a>
                    <a className="btn" href={`/api/report/${r.id}`}>
                      PDF
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
