"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { Capabilities } from "@/lib/capabilities";
import FeedbackModal from "@/components/FeedbackModal";
import { PlanProvider } from "@/contexts/PlanContext";
import type { PlanTier } from "@/types/user";
import DashboardTabs, { type DashboardTab } from "@/components/Dashboard/DashboardTabs";
import DashboardAnalysisPanel from "@/components/features/dashboard/AnalysisPanel";
import { useReviewAnalysis } from "@/hooks/useReviewAnalysis";
import { fetchCapabilities } from "@/lib/api/user";
import { getErrorMessage } from "@/types/common";
import { useTranslation } from "@/lib/i18n";

const LazyAnalysisResults = dynamic(async () => import("@/components/features/dashboard/AnalysisResults"), {
  ssr: false,
  loading: () => <p className="muted">...</p>
});

function DashboardContent({ caps }: { caps: Capabilities | null }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("analysis");
  const [localError, setLocalError] = useState<string | null>(null);
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);
  const { t } = useTranslation();

  const { state, actions, modal } = useReviewAnalysis({
    onNotice: setAnalysisDoneNotice
  });

  const step = useMemo(() => state.step, [state.step]);
  const shownError = localError ?? state.error;

  useEffect(() => {
    if (!state.result) return;

    if (state.result.stats.total === 0) {
      setAnalysisDoneNotice(t("dashboard.noResults"));
      return;
    }

    if (!caps?.supabaseConfigured) {
      setAnalysisDoneNotice(t("dashboard.doneNoStorage"));
      return;
    }

    setAnalysisDoneNotice(null);
  }, [caps?.supabaseConfigured, state.result, t]);

  useEffect(() => {
    if (state.result) {
      setActiveTab("results");
    }
  }, [state.result]);

  useEffect(() => {
    if (!modal.open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") actions.closeCellModal();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, modal.open]);

  const handleFileSelect = useCallback(
    (nextFile: File | null) => {
      setLocalError(null);
      actions.onReset();
      actions.setFile(nextFile);
    },
    [actions]
  );

  const handleAnalyze = useCallback(async () => {
    if (!state.file) {
      setLocalError(t("dashboard.selectFileFirst"));
      return;
    }

    setLocalError(null);
    try {
      await actions.onAnalyze();
    } catch (error: unknown) {
      setLocalError(getErrorMessage(error));
    }
  }, [actions, state.file, t]);

  const handleDownloadPdf = useCallback(async () => {
    const blob = await actions.onDownloadPdf();
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reviewboost-report-${Date.now()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }, [actions]);

  const handleCellClick = useCallback(
    (col: string, value: string) => {
      actions.onCellClick(col, value);
    },
    [actions]
  );

  const dashboardStats = useMemo(
    () => [
      {
        label: t("dashboard.stepLabel"),
        value: `${step}/4`,
        meta: step === 4 ? t("dashboard.stepDone") : step === 3 ? t("dashboard.stepReady") : step === 2 ? t("dashboard.stepMapping") : t("dashboard.stepWaiting")
      },
      {
        label: t("dashboard.selectedFile"),
        value: state.file ? state.file.name : t("dashboard.csvNeeded"),
        meta: state.file ? `${Math.round(state.file.size / 1024)} KB` : t("dashboard.dragSupported")
      },
      {
        label: t("dashboard.workspace"),
        value: caps?.planLabel ?? "Guest mode",
        meta: caps?.supabaseConfigured === false ? t("dashboard.storageDisabled") : state.result?.meta?.stored ? t("dashboard.reportSaved") : t("dashboard.pdfShareable")
      },
      {
        label: t("dashboard.resultStatus"),
        value: state.result ? `${state.result.stats.total}${t("dashboard.analyzed")}` : t("dashboard.waiting"),
        meta: state.result ? `${t("dashboard.negRatio")} ${Math.round((state.result.stats.negativeRatio ?? 0) * 100)}%` : t("dashboard.resultCardPending")
      }
    ],
    [caps?.planLabel, caps?.supabaseConfigured, state.file, state.result, step, t]
  );

  return (
    <main className="pageMain analysisWorkspace">
      {shownError ? (
        <FeedbackModal
          title={t("dashboard.errorTitle")}
          message={shownError}
          tone="error"
          onClose={() => setLocalError(null)}
          actions={[
            { label: t("common.retry"), onClick: handleAnalyze, variant: "primary" },
            { label: t("common.restart"), onClick: actions.onReset }
          ]}
        />
      ) : null}
      {!shownError && analysisDoneNotice ? (
        <FeedbackModal title={t("dashboard.doneTitle")} message={analysisDoneNotice} onClose={() => setAnalysisDoneNotice(null)} />
      ) : null}

      <section className="card dashboardHeroPanel">
        <div className="dashboardHeroCopy">
          <p className="sectionEyebrow">{t("dashboard.heroEyebrow")}</p>
          <h1 className="dashboardPageTitle">{t("dashboard.heroTitle")}</h1>
          <p className="dashboardPageLead">{t("dashboard.heroLead")}</p>
        </div>
        <div className="dashboardStatStrip" aria-label={t("dashboard.currentStatus")}>
          {dashboardStats.map((stat) => (
            <article className="dashboardStatCard" key={stat.label}>
              <span className="dashboardStatLabel">{stat.label}</span>
              <strong className="dashboardStatValue">{stat.value}</strong>
              <span className="dashboardStatMeta">{stat.meta}</span>
            </article>
          ))}
        </div>
      </section>

      <DashboardTabs activeTab={activeTab} onChange={(next) => setActiveTab(next)} />

      <div className="card heroCard dashboardWorkspaceCard">
        {activeTab === "analysis" ? (
          <DashboardAnalysisPanel
            file={state.file}
            busy={state.busy}
            preview={state.preview}
            caps={caps}
            step={step}
            textCol={state.textCol}
            ratingCol={state.ratingCol}
            dateCol={state.dateCol}
            showAllPreviewCols={state.showAllPreviewCols}
            cellModal={modal.payload}
            onFileSelect={handleFileSelect}
            onReset={actions.onReset}
            onSample={actions.onSample}
            onAnalyze={handleAnalyze}
            onTextColChange={actions.setTextCol}
            onRatingColChange={actions.setRatingCol}
            onDateColChange={actions.setDateCol}
            onTogglePreviewCols={() => actions.setShowAllPreviewCols((value) => !value)}
            onCellClick={handleCellClick}
            onCellModalClose={actions.closeCellModal}
          />
        ) : state.result ? (
          <section id="results-panel" role="tabpanel" aria-labelledby="results-tab">
            <LazyAnalysisResults result={state.result} caps={caps} busy={state.busy} onDownloadPdf={handleDownloadPdf} />
          </section>
        ) : (
          <section id="results-panel" role="tabpanel" aria-labelledby="results-tab" className="dashboardEmptyResult">
            <div className="card dashboardEmptyResultCard">
              <p className="sectionEyebrow">Results</p>
              <h2>{t("dashboard.noResultsYet")}</h2>
              <p className="hint">{t("dashboard.noResultsHint")}</p>
              <button type="button" className="btn btnPrimary" onClick={() => setActiveTab("analysis")} aria-label={t("dashboard.goToAnalysisTab")}>
                {t("dashboard.goToAnalysisTab")}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [plan, setPlan] = useState<PlanTier>("free");

  useEffect(() => {
    let cancelled = false;

    async function loadCapabilities() {
      try {
        const next = await fetchCapabilities();
        if (!cancelled) {
          setCaps(next);
          setPlan(next.plan);
        }
      } catch {
        if (!cancelled) {
          setCaps(null);
          setPlan("free");
        }
      }
    }

    loadCapabilities();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PlanProvider plan={plan}>
      <DashboardContent caps={caps} />
    </PlanProvider>
  );
}
