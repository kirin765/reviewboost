import React from "react";
import { redirect } from "next/navigation";
import { buttonStyles } from "@/components/ui/Button";
import { SectionHeader, StatePanel, Surface } from "@/components/ui/Primitives";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type HistoryAnalysisRow = {
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

type SavedReportListItem = {
  id: string;
  title: string;
  createdLabel: string;
  priorityLabel: string;
  pdfStatusLabel: "Ready";
  href: string;
  avatarText: string;
};

function formatSavedAt(value: string) {
  return new Date(value).toLocaleString("ko-KR");
}

function formatSavedDate(value: string) {
  return new Date(value).toLocaleDateString("ko-KR");
}

function getAvatarText(filename: string | null) {
  const base = (filename ?? "").replace(/\.[^.]+$/, "").trim();
  const characters = Array.from(base).filter((character) => /[A-Za-z0-9가-힣]/.test(character));
  if (characters.length === 0) return "RB";
  return characters.slice(0, 2).join("").toUpperCase();
}

function mapSavedReportListItem(row: HistoryAnalysisRow): SavedReportListItem {
  return {
    id: row.id,
    title: row.input_filename ?? "CSV",
    createdLabel: formatSavedAt(row.created_at),
    priorityLabel: Number(row.priority_score ?? 0).toFixed(1),
    pdfStatusLabel: "Ready",
    href: `/dashboard/analysis/${row.id}`,
    avatarText: getAvatarText(row.input_filename)
  };
}

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
        <StatePanel
          title="저장 기능이 비활성화되어 있습니다"
          description="지금은 저장 기능이 꺼져 있어 목록이 표시되지 않습니다. 대신 대시보드에서 분석 후 PDF를 바로 공유용 리포트로 사용할 수 있습니다."
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
        <StatePanel
          title="문제가 발생했어요"
          description="히스토리를 불러오지 못했습니다. 잠시 후 다시 시도해주세요."
          tone="error"
          actions={<a className={buttonStyles({ variant: "secondary" })} href="/dashboard">대시보드</a>}
        />
      </main>
    );
  }

  const rows = (data ?? []) as HistoryAnalysisRow[];
  const items = rows.map(mapSavedReportListItem);
  const avgPriority = rows.length ? rows.reduce((sum, row) => sum + Number(row.priority_score ?? 0), 0) / rows.length : 0;
  const latestCreated = rows[0] ? formatSavedDate(rows[0].created_at) : "없음";

  return (
    <main className="pageMain space-y-6">
      <Surface className="px-6 py-6 md:px-7">
        <SectionHeader eyebrow="Saved reports" title="저장된 리포트" description="최근 저장된 분석을 다시 열어 비교하고 PDF로 공유할 수 있습니다." action={<a className={buttonStyles({ variant: "primary" })} href="/dashboard">새 분석</a>} />
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"><p className="text-xs text-[var(--rb-muted)]">저장된 분석</p><strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em]">{rows.length}</strong></div>
          <div className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"><p className="text-xs text-[var(--rb-muted)]">평균 우선순위</p><strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em]">{rows.length ? avgPriority.toFixed(1) : "-"}</strong></div>
          <div className="rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4"><p className="text-xs text-[var(--rb-muted)]">최근 저장일</p><strong className="mt-2 block text-3xl font-semibold tracking-[-0.05em]">{latestCreated}</strong></div>
        </div>
      </Surface>

      <Surface className="px-6 py-6 md:px-7">
        <SectionHeader eyebrow="Report list" title="목록" />
        {items.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--rb-muted-strong)]">저장된 분석이 없습니다. 먼저 대시보드에서 CSV를 분석해보세요.</p>
        ) : (
          <div className="mt-6 space-y-4" role="table" aria-label="저장된 리포트 목록">
            {items.map((item) => (
              <article key={item.id} className="grid gap-4 rounded-[16px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 lg:grid-cols-[minmax(0,1fr)_190px_110px_auto] lg:items-center">
                <div className="flex items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.06)] text-sm font-semibold text-[var(--rb-fg)]">{item.avatarText}</span>
                  <div>
                    <strong className="block text-base font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{item.title}</strong>
                    <span className="mt-1 block text-xs text-[var(--rb-muted)]">{item.createdLabel}</span>
                  </div>
                </div>
                <div className="text-sm text-[var(--rb-muted-strong)]">Priority {item.priorityLabel}</div>
                <div className="text-sm text-[var(--rb-muted)]">{item.pdfStatusLabel}</div>
                <div className="flex justify-start lg:justify-end">
                  <a className={buttonStyles({ variant: "secondary", size: "sm" })} href={item.href}>상세 보기</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </Surface>
    </main>
  );
}
