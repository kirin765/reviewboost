"use client";

import React, { useCallback, useEffect, useState } from "react";
import type { Capabilities } from "@/lib/capabilities";
import FeedbackModal from "@/components/FeedbackModal";
import { PlanProvider } from "@/contexts/PlanContext";
import type { PlanTier } from "@/types/user";
import DashboardAnalysisPanel from "@/components/features/dashboard/AnalysisPanel";
import { useReviewAnalysis } from "@/hooks/useReviewAnalysis";
import { fetchCapabilities } from "@/lib/api/user";
import { getErrorMessage } from "@/types/common";

function AnalyzeWorkspace({ caps }: { caps: Capabilities | null }) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);

  const { state, actions, modal } = useReviewAnalysis({
    onNotice: setAnalysisDoneNotice
  });

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
          title="문제가 발생했어요"
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

      <DashboardAnalysisPanel
        file={state.file}
        busy={state.busy}
        preview={state.preview}
        result={state.result}
        caps={caps}
        step={state.step}
        analysisStage={state.analysisStage}
        textCol={state.textCol}
        ratingCol={state.ratingCol}
        dateCol={state.dateCol}
        showAllPreviewCols={state.showAllPreviewCols}
        cellModal={modal.payload}
        onFileSelect={handleFileSelect}
        onReset={actions.onReset}
        onSample={actions.onSample}
        onAnalyze={handleAnalyze}
        onDownloadPdf={handleDownloadPdf}
        onTextColChange={actions.setTextCol}
        onRatingColChange={actions.setRatingCol}
        onDateColChange={actions.setDateCol}
        onTogglePreviewCols={() => actions.setShowAllPreviewCols((value) => !value)}
        onCellClick={handleCellClick}
        onCellModalClose={actions.closeCellModal}
      />
    </main>
  );
}

export default function DashboardAnalyzePage() {
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
      <AnalyzeWorkspace caps={caps} />
    </PlanProvider>
  );
}
