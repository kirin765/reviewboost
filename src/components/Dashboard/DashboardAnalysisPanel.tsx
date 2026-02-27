"use client";

import type { Capabilities } from "@/lib/capabilities";
import type { CsvPreview } from "@/lib/csv";
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
  return (
    <section className="dashboardPanel dashboardAnalysisPanel" id="analysis-panel" role="tabpanel" aria-labelledby="analysis-tab">
      <h1 className="heroTitle">리뷰 CSV 분석</h1>
      <div className="analysisFlowGrid">
        <div>
          <AnalysisStepList step={step} />

          <FileUploader
            file={file}
            busy={busy}
            preview={Boolean(preview)}
            onFileSelect={onFileSelect}
            onReset={onReset}
            onSample={onSample}
            onAnalyze={onAnalyze}
          />

          {caps?.supabaseConfigured === false ? (
            <div className="actionRow dashboardPanelHint" role="note">
              <p className="hint muted">
                지금은 저장 기능이 꺼져 있어 저장되지 않습니다. 대신 <strong>PDF 다운로드</strong>로 공유할 수 있어요.
              </p>
            </div>
          ) : caps ? (
            <p className="hint muted dashboardPanelHint">
              현재 플랜: <strong>{caps.planLabel}</strong> · 이번 달 사용량: {caps.monthlyUsed}
              {typeof caps.monthlyLimit === "number" ? ` / ${caps.monthlyLimit}` : ""}
            </p>
          ) : (
            <p className="hint muted dashboardPanelHint">지금은 저장 없이 분석만 진행됩니다. (저장 기능은 로그인 시 활성화됩니다.)</p>
          )}

          <div className="actionRow dashboardPanelActionRow">
            {caps?.supabaseConfigured === false ? null : (
              <a className="btn btnGhost" href="/dashboard/history">
                저장된 리포트
              </a>
            )}
          </div>
        </div>

        <div>
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
          ) : null}
        </div>
      </div>
    </section>
  );
}
