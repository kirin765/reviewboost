"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { Capabilities } from "@/lib/capabilities";
import FeedbackModal from "@/components/FeedbackModal";
import { PlanProvider } from "@/contexts/PlanContext";
import type { PlanTier } from "@/types/user";
import DashboardAnalysisPanel from "@/components/features/dashboard/AnalysisPanel";
import { useReviewAnalysis } from "@/hooks/useReviewAnalysis";
import { fetchCapabilities } from "@/lib/api/user";
import { getErrorMessage } from "@/types/common";
import { Eyebrow, Panel } from "@/components/marketing/MarketingPrimitives";

const LazyAnalysisResults = dynamic(async () => import("@/components/features/dashboard/AnalysisResults"), {
  ssr: false,
  loading: () => <p className="text-sm text-[var(--color-muted)]">분석 결과를 불러오는 중...</p>
});

function StepLights({ step }: { step: 1 | 2 | 3 | 4 }) {
  const steps = [
    ["1", "파일 선택"],
    ["2", "컬럼 확인"],
    ["3", "AI 분석"],
    ["4", "결과 확인"]
  ] as const;

  return (
    <section className="rounded-[24px] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(26,26,26,0.94),rgba(16,16,16,0.96))] px-6 py-6">
      <div className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-muted)]">Analysis Progress</div>
      <div className="mt-6 grid gap-4 md:grid-cols-[repeat(4,minmax(0,1fr))] md:gap-0">
        {steps.map(([index, label], idx) => {
          const active = step >= idx + 1;
          const completed = step > idx + 1;
          const current = step === idx + 1;

          return (
            <div key={index} className="relative">
              {idx < steps.length - 1 ? (
                <div className="pointer-events-none absolute left-[22px] right-[-18px] top-[19px] hidden md:block">
                  <div className="relative h-[6px] overflow-hidden rounded-full bg-emerald-950/50">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-700 ${
                        active ? "bg-emerald-400/90 shadow-[0_0_24px_rgba(52,211,153,0.45)]" : "bg-transparent"
                      }`}
                      style={{ width: completed ? "100%" : current ? "56%" : "0%" }}
                    />
                    {active ? (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.24),transparent_62%)] opacity-60" />
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="flex items-center gap-4">
                <div className="relative flex h-10 w-10 items-center justify-center">
                  <span
                    className={`absolute inset-0 rounded-full border transition-all duration-700 ${
                      active ? "border-emerald-200/50 bg-emerald-300/15 shadow-[0_0_30px_rgba(52,211,153,0.38)]" : "border-emerald-950/80 bg-emerald-950/30"
                    }`}
                  />
                  <span
                    className={`absolute inset-[6px] rounded-full transition-all duration-700 ${
                      active ? "bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.88),rgba(110,231,183,0.88)_34%,rgba(16,185,129,0.74)_68%,rgba(6,78,59,0.95))]" : "bg-[radial-gradient(circle_at_35%_30%,rgba(31,41,55,0.85),rgba(6,95,70,0.26)_45%,rgba(2,44,34,0.9))]"
                    }`}
                  />
                  <span
                    className={`relative text-[11px] font-semibold tracking-[0.12em] ${
                      active ? "text-white" : "text-emerald-200/55"
                    }`}
                  >
                    {index}
                  </span>
                </div>
                <div>
                  <div className="text-xs text-[var(--color-text-tertiary)]">Step {index}</div>
                  <div className={`${active ? "text-white" : "text-[var(--color-muted)]"} text-sm transition-colors`}>{label}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function AnalyzeContent({ caps }: { caps: Capabilities | null }) {
  const [localError, setLocalError] = useState<string | null>(null);
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);
  const { state, actions, modal } = useReviewAnalysis({
    onNotice: setAnalysisDoneNotice
  });

  const shownError = localError ?? state.error;

  useEffect(() => {
    if (!modal.open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") actions.closeCellModal();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, modal.open]);

  async function handleAnalyze() {
    if (!state.file) {
      setLocalError("먼저 CSV 파일을 선택해 주세요.");
      return;
    }

    setLocalError(null);
    try {
      await actions.onAnalyze();
    } catch (error: unknown) {
      setLocalError(getErrorMessage(error));
    }
  }

  async function handleDownloadPdf() {
    const blob = await actions.onDownloadPdf();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `reviewboost-report-${Date.now()}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="pb-16">
      {shownError ? (
        <FeedbackModal
          title="문제가 발생했어요"
          message={shownError}
          tone="error"
          onClose={() => setLocalError(null)}
          actions={[
            { label: "다시 시도", onClick: handleAnalyze, variant: "primary" },
            { label: "초기화", onClick: actions.onReset }
          ]}
        />
      ) : null}
      {!shownError && analysisDoneNotice ? (
        <FeedbackModal title="분석 상태" message={analysisDoneNotice} onClose={() => setAnalysisDoneNotice(null)} />
      ) : null}

      <section className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
        <div className="max-w-[660px]">
          <Eyebrow>Analyze</Eyebrow>
          <h1 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.96]">리뷰 업로드부터 결과 확인까지 한 흐름으로 진행합니다</h1>
          <p className="mt-5 max-w-[720px] text-base leading-8 text-[var(--color-muted)]">
            현재 진행 단계를 상단에서 확인하고, 아래 화면에서 파일 선택부터 열 매핑, 분석 결과 확인까지 이어서 수행합니다.
          </p>
        </div>
        <Panel className="p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              ["입력", "CSV 업로드 또는 샘플 파일로 시작"],
              ["해석", "열 매핑과 AI 분류가 자연스럽게 이어짐"],
              ["결과", "KPI, 우선순위, 액션 아이템까지 즉시 확인"]
            ].map(([title, body]) => (
              <div key={title} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-sm font-medium text-white">{title}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">{body}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <div className="mt-6">
        <StepLights step={state.result ? 4 : state.step} />
      </div>

      <section className="mt-6">
        {state.result ? (
          <LazyAnalysisResults result={state.result} caps={caps} busy={state.busy} onDownloadPdf={handleDownloadPdf} />
        ) : (
          <DashboardAnalysisPanel
            file={state.file}
            busy={state.busy}
            preview={state.preview}
            caps={caps}
            step={state.step}
            textCol={state.textCol}
            ratingCol={state.ratingCol}
            dateCol={state.dateCol}
            showAllPreviewCols={state.showAllPreviewCols}
            cellModal={modal.payload}
            onFileSelect={(file) => {
              setLocalError(null);
              actions.onReset();
              actions.setFile(file);
            }}
            onReset={actions.onReset}
            onSample={actions.onSample}
            onAnalyze={handleAnalyze}
            onTextColChange={actions.setTextCol}
            onRatingColChange={actions.setRatingCol}
            onDateColChange={actions.setDateCol}
            onTogglePreviewCols={() => actions.setShowAllPreviewCols((value) => !value)}
            onCellClick={actions.onCellClick}
            onCellModalClose={actions.closeCellModal}
          />
        )}
      </section>
    </main>
  );
}

export default function AnalyzePage() {
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
      <AnalyzeContent caps={caps} />
    </PlanProvider>
  );
}
