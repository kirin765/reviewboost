import React from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import { getServerTranslation, getServerLocale } from "@/lib/i18n/server";

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

async function formatSavedAt(value: string) {
  const locale = await getServerLocale();
  return new Date(value).toLocaleString(locale === "en" ? "en-US" : "ko-KR");
}

async function formatSavedDate(value: string) {
  const locale = await getServerLocale();
  return new Date(value).toLocaleDateString(locale === "en" ? "en-US" : "ko-KR");
}

function getAvatarText(filename: string | null) {
  const base = (filename ?? "").replace(/\.[^.]+$/, "").trim();
  const characters = Array.from(base).filter((character) => /[A-Za-z0-9가-힣]/.test(character));
  if (characters.length === 0) return "RB";
  return characters.slice(0, 2).join("").toUpperCase();
}

function mapSavedReportListItem(row: HistoryAnalysisRow, createdLabel: string): SavedReportListItem {
  return {
    id: row.id,
    title: row.input_filename ?? "CSV",
    createdLabel,
    priorityLabel: Number(row.priority_score ?? 0).toFixed(1),
    pdfStatusLabel: "Ready",
    href: `/dashboard/analysis/${row.id}`,
    avatarText: getAvatarText(row.input_filename)
  };
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
      <main className="pageMain dashboardPageSurface">
        <div className="card">
          <h2>{t("history.savedReports")}</h2>
          <p className="muted">{t("history.storageOff")}</p>
          <p className="hint muted" dangerouslySetInnerHTML={{ __html: t("history.storageOffHint") }} />
          <div className="actionRow">
            <a className="btn btnPrimary" href="/dashboard">
              {t("history.newAnalysis")}
            </a>
            <a className="btn" href="/help">
              {t("history.help")}
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
          <h2>{t("history.loadFailed")}</h2>
          <p className="hint danger">{t("history.loadError")}</p>
          <div className="actionRow">
            <a className="btn" href="/dashboard">
              {t("history.dashboard")}
            </a>
          </div>
        </div>
      </main>
    );
  }

  const rows = (data ?? []) as HistoryAnalysisRow[];
  const items: SavedReportListItem[] = [];
  for (const row of rows) {
    const label = await formatSavedAt(row.created_at);
    items.push(mapSavedReportListItem(row, label));
  }
  const avgPriority = rows.length ? rows.reduce((sum, row) => sum + Number(row.priority_score ?? 0), 0) / rows.length : 0;
  const latestCreated = rows[0] ? await formatSavedDate(rows[0].created_at) : t("history.none");

  return (
    <main className="pageMain dashboardPageSurface">
      <section className="card dashboardPageHeader">
        <div className="dashboardPageHeaderTop">
          <div>
            <p className="sectionEyebrow">Saved reports</p>
            <h1 className="dashboardPageTitle">{t("history.pageTitle")}</h1>
            <p className="dashboardPageLead">{t("history.pageLead")}</p>
          </div>
          <div className="actionRow">
            <a className="btn btnPrimary" href="/dashboard">
              {t("history.newAnalysis")}
            </a>
          </div>
        </div>

        <div className="dashboardPageStats">
          <article className="dashboardPageStat">
            <span className="dashboardStatLabel">{t("history.savedAnalyses")}</span>
            <strong className="dashboardStatValue">{rows.length}{t("history.countUnit")}</strong>
            <span className="dashboardStatMeta">{t("history.last50")}</span>
          </article>
          <article className="dashboardPageStat">
            <span className="dashboardStatLabel">{t("history.avgPriority")}</span>
            <strong className="dashboardStatValue">{rows.length ? avgPriority.toFixed(1) : "-"}</strong>
            <span className="dashboardStatMeta">{t("history.avgOfSaved")}</span>
          </article>
          <article className="dashboardPageStat">
            <span className="dashboardStatLabel">{t("history.latestSaved")}</span>
            <strong className="dashboardStatValue">{latestCreated}</strong>
            <span className="dashboardStatMeta">{t("history.lastRecord")}</span>
          </article>
        </div>
      </section>

      <section className="card dashboardListCard historyTableCard">
        <div className="dashboardSubsectionHeader">
          <div>
            <p className="sectionEyebrow">Report list</p>
            <h2>{t("history.listTitle")}</h2>
          </div>
        </div>

        {items.length === 0 ? (
          <p className="muted historyTableEmpty">{t("history.empty")}</p>
        ) : (
          <div className="historyTable" role="table" aria-label={t("history.tableLabel")}>
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
                      {t("history.viewDetail")}
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
