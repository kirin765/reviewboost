"use client";

import React from "react";
import type { Capabilities } from "@/lib/capabilities";
import type { AnalysisStage } from "@/lib/analysis-stage";
import type { CsvPreview } from "@/lib/csv";
import { SectionHeader, StatePanel, Surface } from "@/components/ui/Primitives";
import TerminalProgress from "@/components/ui/TerminalProgress";
import FileUploader from "./FileUploader";
import CsvPreviewComponent from "./CsvPreview";
import AnalysisStepList from "./AnalysisStepList";

interface DashboardAnalysisPanelProps {
  file: File | null;
  busy: boolean;
  preview: CsvPreview | null;
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
  onTextColChange: (col: string) => void;
  onRatingColChange: (col: string) => void;
  onDateColChange: (col: string) => void;
  onTogglePreviewCols: () => void;
  onCellClick: (col: string, value: string) => void;
  onCellModalClose: () => void;
}

export default function DashboardAnalysisPanel({
  file,
  busy,
  preview,
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
      : `현재 플랜: ${caps?.planLabel ?? "Guest mode"} · 결과는 저장 또는 PDF 공유로 이어집니다.`;

  return (
    <section className="space-y-6" id="analysis-panel" role="tabpanel" aria-labelledby="analysis-tab">
      <Surface className="px-6 py-6 md:px-7">
        <SectionHeader eyebrow="Analysis flow" title="업로드와 열 매핑" description={sectionHint} />
      </Surface>
      <AnalysisStepList step={step} />

      <div className="grid gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Surface className="p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Step 1</p>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">파일 업로드</h2>
          <div className="mt-5">
            <FileUploader file={file} busy={busy} preview={Boolean(preview)} onFileSelect={onFileSelect} onReset={onReset} onSample={onSample} onAnalyze={onAnalyze} />
          </div>
        </Surface>

        <div className="space-y-4">
          {busy ? <TerminalProgress stage={analysisStage} /> : null}
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
            <StatePanel title="여기도 채워주세요" description="CSV를 올리면 리뷰 내용, 별점, 작성일 열을 바로 확인할 수 있습니다." />
          )}
        </div>
      </div>
    </section>
  );
}
