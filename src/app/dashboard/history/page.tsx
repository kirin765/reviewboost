import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getServerTranslation, getServerLocale } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type HistoryAnalysisRow = {
  id: string;
  created_at: string;
  input_filename: string | null;
  priority_score: number;
};

async function formatSavedAt(value: string) {
  const locale = await getServerLocale();
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "ko-KR");
}

function getAvatarText(filename: string | null) {
  const base = (filename ?? "").replace(/\.[^.]+$/, "").trim();
  const characters = Array.from(base).filter((character) => /[A-Za-z0-9가-힣]/.test(character));
  if (characters.length === 0) return "RB";
  return characters.slice(0, 2).join("").toUpperCase();
}

export default async function HistoryPage() {
  const { t } = await getServerTranslation();

  let supabase: Awaited<ReturnType<typeof createSupabaseServerComponentClient>> | null = null;
  try {
    supabase = await createSupabaseServerComponentClient();
  } catch {
    // Supabase is not configured.
  }

  if (!supabase) {
    return (
      <main className="pb-16">
        <section className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(26,26,26,0.94),rgba(16,16,16,0.96))] p-8">
          <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white">{t("history.savedReports")}</h1>
          <p className="mt-4 text-base leading-8 text-[var(--color-muted)]">{t("history.storageOff")}</p>
        </section>
      </main>
    );
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/login?next=${encodeURIComponent("/dashboard/history")}`);

  const { data } = await supabase
    .from("analyses")
    .select("id, created_at, input_filename, priority_score")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = ((data ?? []) as HistoryAnalysisRow[]).map(async (row) => ({
    ...row,
    createdLabel: await formatSavedAt(row.created_at),
    avatarText: getAvatarText(row.input_filename)
  }));

  const items = await Promise.all(rows);

  return (
    <main className="pb-16">
      <section className="mb-6">
        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-white md:text-6xl">분석결과리스트</h1>
        <p className="mt-4 max-w-[720px] text-base leading-8 text-[var(--color-muted)]">
          저장된 분석 결과를 최신순으로 확인하고, 원하는 리포트로 바로 이동할 수 있습니다.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(26,26,26,0.94),rgba(16,16,16,0.96))]">
        <div className="grid gap-4 border-b border-white/[0.06] px-4 py-4 md:grid-cols-[1.1fr_0.8fr_0.9fr_0.7fr] md:px-6">
          <div className="rounded-[14px] border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-[var(--color-muted)]">Select Date Range</div>
          <div className="rounded-[14px] border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-[var(--color-muted)]">All Files</div>
          <div className="rounded-[14px] border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-[var(--color-muted)]">All Priorities</div>
          <div className="rounded-[14px] border border-white/[0.06] bg-black/20 px-4 py-3 text-sm text-[var(--color-muted)]">Status {items.length}/50</div>
        </div>

        <div className="divide-y divide-white/[0.06]">
          {items.map((item) => (
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
                <div className="mt-1 text-sm text-[var(--color-muted)]">{item.createdLabel}</div>
              </div>

              <div className="flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[var(--color-primary)] text-sm font-semibold text-white">
                  {item.avatarText}
                </span>
                <span className="text-sm text-white">reviewboost</span>
              </div>

              <div>
                <div className="text-sm text-white">main</div>
                <div className="mt-1 text-sm text-[var(--color-muted)]">Priority {Number(item.priority_score ?? 0).toFixed(1)}</div>
              </div>

              <div className="text-right text-sm text-[var(--color-muted)]">열기</div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
