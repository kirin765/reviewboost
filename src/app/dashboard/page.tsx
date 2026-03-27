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

const LazyAnalysisResults = dynamic(async () => import("@/components/features/dashboard/AnalysisResults"), {
  ssr: false,
  loading: () => <p className="muted">분석 결과를 불러오는 중입니다...</p>
});

function DashboardContent({ caps }: { caps: Capabilities | null }) {
  const [activeTab, setActiveTab] = useState<DashboardTab>("analysis");
  const [localError, setLocalError] = useState<string | null>(null);
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);

  const { state, actions, modal } = useReviewAnalysis({
    onNotice: setAnalysisDoneNotice
  });

  const step = useMemo(() => state.step, [state.step]);
  const shownError = localError ?? state.error;

  useEffect(() => {
    if (!state.result) return;

    if (state.result.stats.total === 0) {
      setAnalysisDoneNotice("분석 결과가 없습니다. 데이터 행을 확인해주세요.");
      return;
    }

    if (!caps?.supabaseConfigured) {
      setAnalysisDoneNotice("분석이 완료되었습니다. 저장 기능이 비활성 상태여서 PDF로만 보관 가능합니다.");
      return;
    }

    setAnalysisDoneNotice(null);
  }, [caps?.supabaseConfigured, state.result]);

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
      setLocalError("파일을 먼저 선택해주세요.");
      return;
    }

    setLocalError(null);
    try {
      await actions.onAnalyze();
    } catch (error: unknown) {
      setLocalError(getErrorMessage(error));
    }
  }, [actions, state.file]);

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

  return (
    <main className="pageMain workspacePage">
      {shownError ? (
        <FeedbackModal
          title="분석 처리 오류"
          message={shownError}
          tone="error"
          onClose={() => setLocalError(null)}
          actions={[
            { label: "다시 시도", onClick: handleAnalyze, variant: "primary" },
            { label: "새로 시작", onClick: actions.onReset }
          ]}
        />
      ) : null}
      {!shownError && analysisDoneNotice ? (
        <FeedbackModal title="분석 완료" message={analysisDoneNotice} onClose={() => setAnalysisDoneNotice(null)} />
      ) : null}

      <DashboardTabs activeTab={activeTab} onChange={(next) => setActiveTab(next)} />

      <div className="workspaceSurface">
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
          <section id="results-panel" role="tabpanel" aria-labelledby="results-tab" className="workspaceEmptyState">
            <h2>아직 분석 결과가 없습니다</h2>
            <p className="hint">CSV를 업로드하고 분석을 실행하면 핵심 지표와 개선 액션이 이곳에 표시됩니다.</p>
            <button type="button" className="btn btnPrimary" onClick={() => setActiveTab("analysis")} aria-label="분석하기 탭으로 이동">
              분석하기로 이동
            </button>
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
