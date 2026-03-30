import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { Eyebrow, Panel, primaryButtonClass, secondaryButtonClass } from "@/components/marketing/MarketingPrimitives";

export const dynamic = "force-dynamic";

type AnalysisRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number;
  stats: {
    total?: number;
    negativeRatio?: number;
    avgRating?: number | null;
    recentness?: {
      last30Share?: number;
    };
  } | null;
};

function getAvatarText(filename: string | null) {
  const base = (filename ?? "").replace(/\.[^.]+$/, "").trim();
  const characters = Array.from(base).filter((character) => /[A-Za-z0-9가-힣]/.test(character));
  if (characters.length === 0) return "RB";
  return characters.slice(0, 2).join("").toUpperCase();
}

export default async function DashboardHomePage() {
  let rows: AnalysisRow[] = [];

  try {
    const supabase = await createSupabaseServerComponentClient();
    const { data: userData } = await supabase.auth.getUser();
    if (userData.user) {
      const { data } = await supabase
        .from("analyses")
        .select("id, created_at, input_filename, priority_score, stats")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      rows = (data ?? []) as AnalysisRow[];
    }
  } catch {
    // Keep demo-like empty state when storage or auth is unavailable.
  }

  const totalReviews = rows.reduce((sum, row) => sum + Number(row.stats?.total ?? 0), 0);
  const avgNegativeRatio = rows.length ? rows.reduce((sum, row) => sum + Number(row.stats?.negativeRatio ?? 0), 0) / rows.length : 0;
  const avgRating = rows.length
    ? rows.reduce((sum, row) => sum + Number(row.stats?.avgRating ?? 0), 0) / Math.max(rows.filter((row) => row.stats?.avgRating !== null && row.stats?.avgRating !== undefined).length, 1)
    : 0;
  const avgRecentShare = rows.length ? rows.reduce((sum, row) => sum + Number(row.stats?.recentness?.last30Share ?? 0), 0) / rows.length : 0;

  const stats = [
    ["총 리뷰", `${totalReviews || 0}`],
    ["부정비율", `${Math.round(avgNegativeRatio * 100)}%`],
    ["평균 별점", rows.length ? avgRating.toFixed(2) : "0.00"],
    ["최근 30일 비중", `${Math.round(avgRecentShare * 100)}%`]
  ];

  return (
    <main className="pb-16">
      <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
        <div className="max-w-[640px]">
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.96]">저장된 분석과 전체 흐름을 한 번에 봅니다</h1>
          <p className="mt-5 max-w-[760px] text-base leading-8 text-[var(--color-muted)]">
            지금까지 저장된 분석을 기준으로 전체 통계를 보고, 하단 리스트에서 개별 결과를 바로 열 수 있습니다.
          </p>
        </div>
        <Panel className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["전체 모니터링", "모든 분석에서 반복되는 문제를 한 화면에서 추적"],
              ["우선순위 확인", "부정 비율과 최근성 기준으로 급한 이슈 판단"],
              ["히스토리 접근", "저장된 분석을 바로 열고 비교"]
            ].map(([title, body]) => (
              <div key={title} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-sm font-medium text-white">{title}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-4">
        {stats.map(([label, value], index) => (
          <article key={label} className="rounded-[24px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(20,24,31,0.94),rgba(9,12,17,0.96))] p-5">
            <div className="flex items-center justify-between">
              <div className="text-lg text-white">{label}</div>
              {index === 0 ? <span className="text-white">↗</span> : index === 3 ? <span className="text-[var(--color-warning)]">•</span> : <span className="text-white">•</span>}
            </div>
            <div className="mt-5 text-4xl font-semibold tracking-[-0.05em] text-white">{value}</div>
            <div className="mt-4 h-[72px] rounded-[18px] bg-[linear-gradient(180deg,rgba(143,212,255,0.12),rgba(91,108,255,0.03))]" />
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(20,24,31,0.94),rgba(9,12,17,0.96))]">
        <div className="border-b border-white/[0.06] px-4 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-4xl font-semibold tracking-[-0.04em] text-white">분석 결과 리스트</div>
              <div className="mt-2 text-sm text-[var(--color-muted)]">최근 저장된 분석부터 바로 확인할 수 있습니다.</div>
            </div>
            <div className="flex gap-3">
              <a href="/dashboard/analyze" className={primaryButtonClass}>새 분석 시작</a>
              <a href="/coupang-csv" className={secondaryButtonClass}>리뷰 CSV 가져오기</a>
            </div>
          </div>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {rows.length === 0 ? (
            <div className="px-6 py-10 text-base text-[var(--color-muted)]">아직 저장된 분석 결과가 없습니다. 분석하기 화면에서 첫 분석을 시작하세요.</div>
          ) : (
            rows.map((item) => (
              <a
                key={item.id}
                href={`/dashboard/analysis/${item.id}`}
                className="grid items-center gap-4 px-4 py-5 transition hover:bg-white/[0.02] md:grid-cols-[1.1fr_0.8fr_1fr_0.9fr_0.8fr] md:px-6"
              >
                <div>
                  <div className="text-xl font-semibold tracking-[-0.03em] text-white">{item.id.slice(0, 10)}</div>
                  <div className="mt-1 text-sm text-[var(--color-muted)]">{item.input_filename ?? "CSV"}</div>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-white">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    <span>Ready</span>
                  </div>
                  <div className="mt-1 text-sm text-[var(--color-muted)]">{new Date(item.created_at).toLocaleDateString("ko-KR")}</div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-primary)] text-sm font-semibold text-white">
                    {getAvatarText(item.input_filename)}
                  </span>
                  <span className="text-sm text-white">reviewboost</span>
                </div>

                <div>
                  <div className="text-sm text-white">main</div>
                  <div className="mt-1 text-sm text-[var(--color-muted)]">Priority {Number(item.priority_score ?? 0).toFixed(1)}</div>
                </div>

                <div className="text-right text-sm text-[var(--color-muted)]">열기</div>
              </a>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
