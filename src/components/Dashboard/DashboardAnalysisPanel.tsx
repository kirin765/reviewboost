"use client";

import React from "react";
import type { Capabilities } from "@/lib/capabilities";
import type { AnalysisStage } from "@/lib/analysis-stage";
import type { DashboardAnalysisResult } from "@/lib/api/analysis";
import type { CsvPreview } from "@/lib/csv";
import { buttonStyles } from "@/components/ui/Button";
import { StatePanel, Surface } from "@/components/ui/Primitives";
import TerminalProgress from "@/components/ui/TerminalProgress";
import AnalysisResults from "@/components/features/dashboard/AnalysisResults";
import FileUploader from "./FileUploader";
import CsvPreviewComponent from "./CsvPreview";
import AnalysisStepList from "./AnalysisStepList";

interface DashboardAnalysisPanelProps {
  file: File | null;
  busy: boolean;
  preview: CsvPreview | null;
  result: DashboardAnalysisResult | null;
  textCol: string;
  ratingCol: string;
  dateCol: string;
  showAllPreviewCols: boolean;
  cellModal: { col: string; value: string } | null;
  caps: Capabilities | null;
  step: 1 | 2 | 3 | 4;
  analysisStage: AnalysisStage;
  onFileSelect: (file: File | null) => void;
  onReset: () => void;
  onSample: () => void;
  onAnalyze: () => void;
  onDownloadPdf: () => Promise<void> | void;
  onBackToUpload?: () => void;
  onTextColChange: (col: string) => void;
  onRatingColChange: (col: string) => void;
  onDateColChange: (col: string) => void;
  onTogglePreviewCols: () => void;
  onCellClick: (col: string, value: string) => void;
  onCellModalClose: () => void;
}

const STEP_COPY: Record<1 | 2 | 3 | 4, { eyebrow: string; title: string; description: string }> = {
  1: {
    eyebrow: "1단계",
    title: "CSV 업로드",
    description: "분석을 시작할 CSV를 올리거나 샘플 파일로 바로 테스트합니다."
  },
  2: {
    eyebrow: "2단계",
    title: "열 확인",
    description: "리뷰 내용, 별점, 작성일 열을 한 번만 확인하면 분석 준비가 끝납니다."
  },
  3: {
    eyebrow: "3단계",
    title: "분석 진행",
    description: "리뷰 수집, 감정 분석, 카테고리 분류, 우선순위 계산을 순서대로 실행합니다."
  },
  4: {
    eyebrow: "4단계",
    title: "결과 확인",
    description: "요약 지표와 긴급 리뷰, 우선순위, 시뮬레이션, 액션 아이템을 읽습니다."
  }
};

function planDisplayLabel(caps: Capabilities | null) {
  if (!caps) return "게스트";
  if (caps.plan === "free") return "무료";
  if (caps.plan === "basic") return "Basic";
  return "Pro";
}

export default function DashboardAnalysisPanel({
  file,
  busy,
  preview,
  result,
  caps,
  step,
  analysisStage,
  textCol,
  ratingCol,
  dateCol,
  showAllPreviewCols,
  cellModal,
  onFileSelect,
  onReset,
  onSample,
  onAnalyze,
  onDownloadPdf,
  onBackToUpload,
  onTextColChange,
  onRatingColChange,
  onDateColChange,
  onTogglePreviewCols,
  onCellClick,
  onCellModalClose
}: DashboardAnalysisPanelProps) {
  const sectionHint =
    caps?.supabaseConfigured === false
      ? "저장 없이 PDF 다운로드 중심으로 결과를 확인합니다."
      : `현재 플랜: ${planDisplayLabel(caps)} · 결과는 저장 또는 PDF 공유로 이어집니다.`;
  const handleBackToUpload = onBackToUpload ?? onReset;

  const actionRail = (
    <div className="mt-8 flex flex-col gap-3 border-t border-[color:rgba(222,230,242,0.08)] pt-6 md:flex-row md:items-center md:justify-between">
      <div className="max-w-2xl text-sm leading-7 text-[var(--rb-muted)]">
        {step === 1 ? "파일을 선택한 뒤 다음 단계로 이동해 열 매핑을 확인합니다." : null}
        {step === 2 ? "열 매핑이 맞으면 바로 분석을 시작하고, 수정이 필요하면 다시 업로드로 돌아갑니다." : null}
        {step === 3 ? "분석이 진행되는 동안 결과 화면으로 자동 전환됩니다. 최대 5분 정도 소요될 수 있습니다." : null}
      </div>
      <div className="flex flex-wrap gap-3">
        {step === 1 ? (
          <button type="button" className={buttonStyles({ variant: "primary" })} onClick={onAnalyze} disabled={!file || busy}>
            다음: 열 확인
          </button>
        ) : null}
        {step === 2 ? (
          <>
            <button type="button" className={buttonStyles({ variant: "secondary" })} onClick={handleBackToUpload} disabled={busy}>
              다시 업로드
            </button>
            <button type="button" className={buttonStyles({ variant: "primary" })} onClick={onAnalyze} disabled={busy}>
              분석 시작
            </button>
          </>
        ) : null}
        {step === 3 ? (
          <>
            <button type="button" className={buttonStyles({ variant: "secondary" })} onClick={handleBackToUpload} disabled>
              다시 업로드
            </button>
            <button type="button" className={buttonStyles({ variant: "primary" })} disabled>
              분석 진행 중...
            </button>
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <section className="space-y-8">
      <div className="space-y-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">현재 단계</p>
        <AnalysisStepList step={step} />
      </div>

      {step === 4 && result ? (
        <AnalysisResults result={result} caps={caps} busy={busy} onDownloadPdf={onDownloadPdf} />
      ) : (
        <Surface className="px-5 py-6 md:px-7 md:py-7">
          <div className="border-b border-[color:rgba(222,230,242,0.08)] pb-6">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{STEP_COPY[step].eyebrow}</p>
            <h2 className="mt-3 text-[clamp(2rem,3vw,3rem)] font-semibold tracking-[-0.05em] text-white">{STEP_COPY[step].title}</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--rb-muted-strong)]">
              {STEP_COPY[step].description} {sectionHint}
            </p>
          </div>

          <div className="mt-7">
            {step === 1 ? (
              <div className="grid gap-8 xl:grid-cols-[minmax(0,0.92fr)_300px]">
                <div>
                  <FileUploader file={file} busy={busy} onFileSelect={onFileSelect} onReset={onReset} onSample={onSample} />
                </div>
                <div className="border-t border-[color:rgba(222,230,242,0.08)] pt-6 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">업로드 안내</p>
                  <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
                    <p>필수: 리뷰 내용(텍스트)</p>
                    <p>권장: 별점(0~5)</p>
                    <p>선택: 작성일</p>
                    <p>업로드 후 바로 열 미리보기가 생성되고, 다음 단계에서 수정할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {step === 2 && preview ? (
              <CsvPreviewComponent
                preview={preview}
                busy={busy}
                textCol={textCol}
                ratingCol={ratingCol}
                dateCol={dateCol}
                showAllPreviewCols={showAllPreviewCols}
                cellModal={cellModal}
                onTextColChange={onTextColChange}
                onRatingColChange={onRatingColChange}
                onDateColChange={onDateColChange}
                onTogglePreviewCols={onTogglePreviewCols}
                onCellClick={onCellClick}
                onCellModalClose={onCellModalClose}
              />
            ) : null}

            {step === 3 ? (
              <div className="space-y-6">
                <TerminalProgress stage={analysisStage} />
                {preview ? (
                  <CsvPreviewComponent
                    preview={preview}
                    busy={busy}
                    textCol={textCol}
                    ratingCol={ratingCol}
                    dateCol={dateCol}
                    showAllPreviewCols={showAllPreviewCols}
                    cellModal={cellModal}
                    onTextColChange={onTextColChange}
                    onRatingColChange={onRatingColChange}
                    onDateColChange={onDateColChange}
                    onTogglePreviewCols={onTogglePreviewCols}
                    onCellClick={onCellClick}
                    onCellModalClose={onCellModalClose}
                  />
                ) : (
                  <StatePanel title="여기도 채워주세요" description="미리보기가 준비되면 분석 진행과 함께 이곳에 현재 데이터가 표시됩니다." />
                )}
              </div>
            ) : null}

            {step === 2 && !preview ? (
              <StatePanel title="여기도 채워주세요" description="CSV를 올리면 리뷰 내용, 별점, 작성일 열을 바로 확인할 수 있습니다." />
            ) : null}
          </div>

          {step < 4 ? actionRail : null}
        </Surface>
      )}
    </section>
  );
}
