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

  const dashboardStats = useMemo(
    () => [
      {
        label: "진행 단계",
        value: `${step}/4`,
        meta: step === 4 ? "분석 완료" : step === 3 ? "실행 준비" : step === 2 ? "열 매핑 확인" : "CSV 업로드 대기"
      },
      {
        label: "선택 파일",
        value: state.file ? state.file.name : "CSV 필요",
        meta: state.file ? `${Math.round(state.file.size / 1024)} KB` : "드래그 앤 드롭 지원"
      },
      {
        label: "워크스페이스",
        value: caps?.planLabel ?? "Guest mode",
        meta: caps?.supabaseConfigured === false ? "저장 비활성" : state.result?.meta?.stored ? "리포트 저장됨" : "PDF 공유 가능"
      },
      {
        label: "결과 상태",
        value: state.result ? `${state.result.stats.total}건 분석` : "대기 중",
        meta: state.result ? `부정 비율 ${Math.round((state.result.stats.negativeRatio ?? 0) * 100)}%` : "결과 카드 준비 전"
      }
    ],
    [caps?.planLabel, caps?.supabaseConfigured, state.file, state.result, step]
  );

  return (
    <main className="pageMain analysisWorkspace">
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

      <section className="card dashboardHeroPanel">
        <div className="dashboardHeroCopy">
          <p className="sectionEyebrow">Analysis studio</p>
          <h1 className="dashboardPageTitle">리뷰 CSV를 업로드하고 개선 액션까지 바로 확인하세요.</h1>
          <p className="dashboardPageLead">
            파일 업로드, 열 매핑, 분석 실행, PDF 다운로드를 한 화면에서 처리할 수 있습니다.
          </p>
        </div>
        <div className="dashboardStatStrip" aria-label="현재 분석 상태">
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
              <h2>아직 분석 결과가 없습니다</h2>
              <p className="hint">CSV를 업로드하고 분석을 완료하면 핵심 지표, 우선순위, 액션 아이템이 이곳에 표시됩니다.</p>
              <button type="button" className="btn btnPrimary" onClick={() => setActiveTab("analysis")} aria-label="분석하기 탭으로 이동">
                분석하기로 이동
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
