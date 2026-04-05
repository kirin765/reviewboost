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

function MiniSparkline({ color = "#4f7fff" }: { color?: string }) {
  // Decorative mini bar chart
  const bars = [35, 52, 44, 68, 58, 75, 61, 82, 70, 90];
  return (
    <div className="flex items-end gap-[3px] h-10 w-full">
      {bars.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm opacity-70"
          style={{
            height: `${h}%`,
            background: `linear-gradient(180deg, ${color}cc, ${color}44)`,
            animationDelay: `${i * 60}ms`
          }}
        />
      ))}
    </div>
  );
}

function StatCard({
  label,
  value,
  accent = false,
  warning = false,
  danger = false
}: {
  label: string;
  value: string;
  accent?: boolean;
  warning?: boolean;
  danger?: boolean;
}) {
  const color = danger ? "#f87171" : warning ? "#f2c94c" : accent ? "#4f7fff" : "#4f7fff";
  const textColor = danger ? "text-[#f87171]" : warning ? "text-[#f2c94c]" : "text-white";

  return (
    <article className="group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(18,22,32,0.96),rgba(10,13,20,0.98))] p-5 transition-all duration-300 hover:border-white/[0.12]">
      <div
        className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 30% 30%, ${color}0d, transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--color-muted)]">{label}</div>
          <div
            className="h-2 w-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
          />
        </div>
        <div className={`mt-3 text-[2.1rem] font-semibold tracking-[-0.055em] ${textColor}`}>{value}</div>
        <div className="mt-3">
          <MiniSparkline color={color} />
        </div>
      </div>
    </article>
  );
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

  return (
    <main className="pb-16">
      {/* Header */}
      <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
        <div className="max-w-[640px]">
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="mt-5 text-[2.2rem] font-semibold leading-[1.1] tracking-[-0.06em] text-white md:text-[3rem] md:leading-[1.04]">
            저장된 분석과<br />전체 흐름을 한 번에 봅니다
          </h1>
          <p className="mt-4 max-w-[560px] text-[0.975rem] leading-[1.85] text-[var(--color-muted)]">
            지금까지 저장된 분석을 기준으로 전체 통계를 보고, 하단 리스트에서 개별 결과를 바로 열 수 있습니다.
          </p>
        </div>
        <Panel className="p-5">
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ["전체 모니터링", "모든 분석에서 반복되는 문제를 한 화면에서 추적"],
              ["우선순위 확인", "부정 비율과 최근성 기준으로 급한 이슈 판단"],
              ["히스토리 접근", "저장된 분석을 바로 열고 비교"]
            ].map(([title, body]) => (
              <div key={title} className="rounded-[18px] border border-white/[0.07] bg-white/[0.025] p-4">
                <div className="text-sm font-medium text-white">{title}</div>
                <p className="mt-1.5 text-xs leading-[1.7] text-[var(--color-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* KPI Grid */}
      <section className="mt-8 grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        <StatCard label="총 리뷰" value={String(totalReviews || 0)} accent />
        <StatCard label="부정비율" value={`${Math.round(avgNegativeRatio * 100)}%`} danger={avgNegativeRatio > 0.3} warning={avgNegativeRatio > 0.15} />
        <StatCard label="평균 별점" value={rows.length ? avgRating.toFixed(2) : "0.00"} warning={avgRating < 3.5 && avgRating > 0} />
        <StatCard label="최근 30일 비중" value={`${Math.round(avgRecentShare * 100)}%`} warning />
      </section>

      {/* Analysis List */}
      <section className="mt-6 overflow-hidden rounded-[26px] border border-white/[0.07] bg-[linear-gradient(160deg,rgba(16,20,30,0.97),rgba(9,12,18,0.99))]">
        <div className="border-b border-white/[0.06] px-5 py-4 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[1.6rem] font-semibold tracking-[-0.04em] text-white">분석 결과 리스트</div>
              <div className="mt-1 text-xs text-[var(--color-muted)]">최근 저장된 분석부터 바로 확인할 수 있습니다.</div>
            </div>
            <div className="flex gap-3">
              <a href="/dashboard/analyze" className={primaryButtonClass}>새 분석 시작</a>
              <a href="/coupang-csv" className={secondaryButtonClass}>리뷰 CSV 가져오기</a>
            </div>
          </div>
        </div>

        {rows.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/[0.08] bg-white/[0.03] text-3xl">
              📊
            </div>
            <div className="mt-5 text-lg font-medium text-white">아직 저장된 분석이 없습니다</div>
            <p className="mt-2 max-w-[340px] text-sm leading-7 text-[var(--color-muted)]">
              분석하기 화면에서 리뷰 CSV를 업로드하거나 URL로 리뷰를 가져와 첫 분석을 시작하세요.
            </p>
            <a href="/dashboard/analyze" className={`mt-6 ${primaryButtonClass}`}>첫 분석 시작하기</a>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden border-b border-white/[0.05] px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)] md:grid md:grid-cols-[1.1fr_0.7fr_0.9fr_0.7fr_0.5fr] md:gap-4 md:px-6">
              <span>파일명</span>
              <span>상태</span>
              <span>소유자</span>
              <span>우선순위</span>
              <span className="text-right">열기</span>
            </div>
            <div className="divide-y divide-white/[0.05]">
              {rows.map((item) => {
                const priorityScore = Number(item.priority_score ?? 0);
                const priorityColor = priorityScore >= 70 ? "#f87171" : priorityScore >= 45 ? "#f2c94c" : "#34d399";
                return (
                  <a
                    key={item.id}
                    href={`/dashboard/analysis/${item.id}`}
                    className="group grid items-center gap-4 px-5 py-4 transition-all duration-150 hover:bg-white/[0.025] md:grid-cols-[1.1fr_0.7fr_0.9fr_0.7fr_0.5fr] md:px-6"
                  >
                    <div>
                      <div className="text-sm font-semibold tracking-[-0.02em] text-white group-hover:text-[#7ba8ff] transition-colors">
                        {item.input_filename ?? "CSV"}
                      </div>
                      <div className="mt-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">{item.id.slice(0, 12)}…</div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-[#34d399] opacity-60 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#34d399]" />
                        </span>
                        <span className="text-sm text-white">Ready</span>
                      </div>
                      <div className="mt-0.5 text-xs text-[var(--color-muted)]">{new Date(item.created_at).toLocaleDateString("ko-KR")}</div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <span className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,rgba(79,127,255,0.28),rgba(99,102,241,0.18))] text-xs font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                        {getAvatarText(item.input_filename)}
                      </span>
                      <span className="text-sm text-[var(--color-muted)]">reviewboost</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: priorityColor }}>
                          {priorityScore.toFixed(1)}
                        </span>
                        <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden max-w-[48px]">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(priorityScore, 100)}%`, background: priorityColor }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-[var(--color-muted)] group-hover:text-white transition-colors">열기 →</span>
                    </div>
                  </a>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
