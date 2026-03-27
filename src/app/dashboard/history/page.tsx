import React from "react";
import { redirect } from "next/navigation";
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

  const rows = (data ?? []) as HistoryAnalysisRow[];
  const items = rows.map(mapSavedReportListItem);
  const avgPriority = rows.length ? rows.reduce((sum, row) => sum + Number(row.priority_score ?? 0), 0) / rows.length : 0;
  const latestCreated = rows[0] ? formatSavedDate(rows[0].created_at) : "없음";

  return (
    <main className="pageMain workspacePage">
      <section className="card">
        <div className="appPageHeader">
          <div>
            <p className="sectionEyebrow">Saved reports</p>
            <h1 className="appPageTitle">저장된 리포트</h1>
            <p className="appPageLead">최근 50개까지의 저장된 분석을 빠르게 다시 열고 상세 리포트로 이동할 수 있습니다.</p>
          </div>
          <div className="appPageActions">
            <a className="btn btnPrimary" href="/dashboard">
              새 분석
            </a>
          </div>
        </div>

        <div className="appPageMetaGrid">
          <article className="appPageMetaItem">
            <span>저장된 분석</span>
            <strong>{rows.length}건</strong>
            <p className="hint">최근 50개 기준</p>
          </article>
          <article className="appPageMetaItem">
            <span>평균 우선순위</span>
            <strong>{rows.length ? avgPriority.toFixed(1) : "-"}</strong>
            <p className="hint">저장 리포트 평균</p>
          </article>
          <article className="appPageMetaItem">
            <span>최근 저장일</span>
            <strong>{latestCreated}</strong>
            <p className="hint">마지막 분석 기록</p>
          </article>
        </div>
      </section>

      <section className="card dashboardListCard historyTableCard">
        <div className="workspaceSectionHeading">
          <div>
            <p className="sectionEyebrow">Report list</p>
            <h2>목록</h2>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="muted historyTableEmpty">저장된 분석이 없습니다. 먼저 대시보드에서 CSV를 분석해보세요.</p>
        ) : (
          <div className="historyTable" role="table" aria-label="저장된 리포트 목록">
            <div className="historyTableHeader" role="row">
              <span>Report</span>
              <span>Saved at</span>
              <span>Priority</span>
              <span>PDF</span>
              <span aria-hidden="true" />
            </div>
            <div className="historyTableBody">
              {items.map((item) => (
                <article className="historyTableRow" key={item.id}>
                  <div className="historyReportCell">
                    <span className="historyAvatar" aria-hidden="true">
                      {item.avatarText}
                    </span>
                    <div className="historyReportText">
                      <strong className="historyReportTitle">{item.title}</strong>
                    </div>
                  </div>

                  <div className="historyMetaCell historyMetaCellSaved">
                    <span className="historyMetaLabel">Saved at</span>
                    <span className="historyMetaValue">{item.createdLabel}</span>
                  </div>

                  <div className="historyMetaCell historyMetaCellPriority">
                    <span className="historyMetaLabel">Priority</span>
                    <span className="historyPriorityBadge">Priority {item.priorityLabel}</span>
                  </div>

                  <div className="historyMetaCell historyMetaCellPdf">
                    <span className="historyMetaLabel">PDF</span>
                    <span className="historyPdfBadge">{item.pdfStatusLabel}</span>
                  </div>

                  <div className="historyActionCell">
                    <a className="btn historyRowAction" href={item.href}>
                      상세 보기
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
