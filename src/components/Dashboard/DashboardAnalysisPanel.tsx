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
  const sectionHint =
    caps?.supabaseConfigured === false
      ? "저장 없이 PDF 다운로드 중심으로 결과를 확인합니다."
      : `현재 플랜: ${caps?.planLabel ?? "Guest mode"} · 결과는 저장 또는 PDF 공유로 이어집니다.`;

  return (
    <section className="dashboardPanel dashboardAnalysisPanel" id="analysis-panel" role="tabpanel" aria-labelledby="analysis-tab">
      <div className="workspaceSectionHeading">
        <div>
          <p className="sectionEyebrow">Analysis flow</p>
          <h2>업로드와 열 매핑</h2>
        </div>
        <p className="workspaceSectionHint">{sectionHint}</p>
      </div>

      <AnalysisStepList step={step} />

      <div className="analysisFlowGrid analysisFlowGridEnhanced">
        <div className="analysisControlColumn">
          <div className="card surfaceCard">
            <div className="dashboardSubsectionHeader">
              <div>
                <p className="sectionEyebrow">Step 1</p>
                <h2>파일 업로드</h2>
              </div>
            </div>
            <FileUploader file={file} busy={busy} preview={Boolean(preview)} onFileSelect={onFileSelect} onReset={onReset} onSample={onSample} onAnalyze={onAnalyze} />
          </div>
        </div>

        <div className="analysisPreviewColumn">
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
            <div className="workspaceInlineEmptyState">
              <p className="sectionEyebrow">Step 2</p>
              <h2>열 미리보기 대기 중</h2>
              <p className="muted">CSV를 올리면 리뷰 내용, 별점, 작성일 열을 바로 확인할 수 있습니다.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
