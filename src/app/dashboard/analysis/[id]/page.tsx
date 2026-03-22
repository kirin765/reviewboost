import { redirect } from "next/navigation";
import { createSupabaseServerComponentClient } from "@/lib/supabase/server";
import type { AnalysisOutput } from "@/lib/types";
import AnalysisResultDigest from "@/components/Analysis/AnalysisResultDigest";
import { getServerTranslation, getServerLocale } from "@/lib/i18n/server";

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
  const { t } = await getServerTranslation();
  const locale = await getServerLocale();

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
          <h2>{t("detail.viewSaved")}</h2>
          <p className="muted">{t("detail.storageOff")}</p>
          <p className="hint muted" dangerouslySetInnerHTML={{ __html: t("detail.storageOffHint") }} />
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
          <h2>{t("detail.notFound")}</h2>
          <p className="muted">{t("detail.notFoundHint")}</p>
          {error ? <p className="hint danger">{t("detail.errorOccurred")}</p> : null}
          <div className="actionRow">
            <a className="btn" href="/dashboard/history">
              {t("detail.history")}
            </a>
          </div>
        </div>
      </main>
    );
  }

  const row = data as AnalysisRow;
  const created = new Date(row.created_at).toLocaleString(locale === "en" ? "en-US" : "ko-KR");
  const priorityScore = Number(row.priority_score ?? 0);

  const result: Pick<AnalysisOutput, "stats" | "suggestions"> = {
    stats: row.stats ?? EMPTY_ANALYSIS_RESULT.stats,
    suggestions: row.suggestions ?? EMPTY_ANALYSIS_RESULT.suggestions
  };

  const summaryStats = [
    { label: t("detail.totalReviews"), value: `${result.stats.total}${t("detail.countUnit")}`, meta: row.input_filename ?? "CSV" },
    {
      label: t("detail.negativeRatio"),
      value: `${Math.round((result.stats.negativeRatio ?? 0) * 100)}%`,
      meta: t("detail.negativeCount", { count: result.stats.negative ?? 0 })
    },
    {
      label: t("detail.avgRating"),
      value: result.stats.avgRating === null ? t("detail.notProvided") : `${result.stats.avgRating.toFixed(1)}${t("detail.pointsUnit")}`,
      meta: t("detail.ratingHint")
    }
  ];

  return (
    <main className="pageMain dashboardPageSurface">
      <section className="card dashboardPageHeader dashboardDetailHero">
        <div className="dashboardPageHeaderTop">
          <div>
            <p className="sectionEyebrow">Saved report</p>
            <h1 className="dashboardPageTitle">{t("detail.pageTitle")}</h1>
            <p className="dashboardPageLead">
              {row.input_filename ?? "CSV"} · {created} · {t("detail.priority")} {priorityScore.toFixed(1)}
            </p>
          </div>
          <div className="actionRow">
            <a className="btn" href="/dashboard/history">
              {t("detail.history")}
            </a>
            <a className="btn btnPrimary" href="/dashboard">
              {t("history.newAnalysis")}
            </a>
            <a className="btn" href={`/api/report/${row.id}`}>
              {t("detail.downloadPdf")}
            </a>
          </div>
        </div>

        <div className="dashboardPageStats">
          {summaryStats.map((stat) => (
            <article className="dashboardPageStat" key={stat.label}>
              <span className="dashboardStatLabel">{stat.label}</span>
              <strong className="dashboardStatValue">{stat.value}</strong>
              <span className="dashboardStatMeta">{stat.meta}</span>
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
