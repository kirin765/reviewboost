"use client";

import type { Capabilities } from "@/lib/capabilities";
import type { CsvPreview } from "@/lib/csv";
import FileUploader from "./FileUploader";
import CsvPreviewComponent from "./CsvPreview";

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
  const steps = [
    { n: 1, label: "파일 선택", desc: "CSV 업로드" },
    { n: 2, label: "열 매핑", desc: "텍스트/별점/작성일" },
    { n: 3, label: "분석 진행", desc: "우선순위·액션 자동 산출" },
    { n: 4, label: "결과 확인", desc: "리포트 다운로드" }
  ];

  return (
    <section className="dashboardPanel dashboardAnalysisPanel" id="analysis-panel" role="tabpanel" aria-labelledby="analysis-tab">
      <h1 className="heroTitle">리뷰 CSV 분석</h1>
      <div className="stepper" role="list" aria-label="분석 단계">
        {steps.map((item) => {
          const isDone = step > item.n;
          const isCurrent = step === item.n;
          return (
            <div className={`step ${isDone ? "completed" : ""} ${isCurrent ? "active" : ""}`} key={item.label} role="listitem">
              <span className="stepNumber">{item.n}</span>
              <span>
                <div>{item.label}</div>
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{item.desc}</div>
              </span>
            </div>
          );
        })}
      </div>

      <FileUploader
        file={file}
        busy={busy}
        preview={Boolean(preview)}
        onFileSelect={onFileSelect}
        onReset={onReset}
        onSample={onSample}
        onAnalyze={onAnalyze}
      />

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
    </section>
  );
}
