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
  const infoCards = [
    {
      label: "업로드 상태",
      value: file ? file.name : "파일 없음",
      meta: file ? `${Math.round(file.size / 1024)} KB` : "CSV 파일을 추가하세요"
    },
    {
      label: "미리보기",
      value: preview ? `${preview.totalRows} rows` : "대기 중",
      meta: preview ? `${preview.columns.length} columns detected` : "열 추정 후 매핑 가능"
    },
    {
      label: "저장/플랜",
      value: caps?.planLabel ?? "Guest mode",
      meta: caps?.supabaseConfigured === false ? "저장 기능 비활성" : "리포트 저장 또는 PDF 공유"
    }
  ];

  return (
    <section className="dashboardPanel dashboardAnalysisPanel" id="analysis-panel" role="tabpanel" aria-labelledby="analysis-tab">
      <div className="dashboardSectionHeader">
        <div>
          <p className="sectionEyebrow">Upload and map</p>
          <h1 className="dashboardSectionTitle">리뷰 CSV 분석</h1>
          <p className="dashboardSectionLead">업로드, 열 매핑, 실행까지 한 화면에서 처리하고, 결과는 곧바로 리포트 카드로 연결됩니다.</p>
        </div>
        <div className="analysisInfoCards">
          {infoCards.map((card) => (
            <article className="miniStatCard" key={card.label}>
              <span className="dashboardStatLabel">{card.label}</span>
              <strong className="dashboardStatValue">{card.value}</strong>
              <span className="dashboardStatMeta">{card.meta}</span>
            </article>
          ))}
        </div>
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
              <span className="pill pillActive">CSV only</span>
            </div>
            <FileUploader file={file} busy={busy} preview={Boolean(preview)} onFileSelect={onFileSelect} onReset={onReset} onSample={onSample} onAnalyze={onAnalyze} />
          </div>

          <div className="card surfaceCard dashboardInfoCard">
            <div className="dashboardSubsectionHeader">
              <div>
                <p className="sectionEyebrow">Workspace notes</p>
                <h2>현재 워크스페이스 안내</h2>
              </div>
            </div>

            {caps?.supabaseConfigured === false ? (
              <div className="actionRow dashboardPanelHint" role="note">
                <p className="hint muted">
                  지금은 저장 기능이 꺼져 있어 저장되지 않습니다. 대신 <strong>PDF 다운로드</strong>로 바로 공유할 수 있습니다.
                </p>
              </div>
            ) : caps ? (
              <p className="hint muted dashboardPanelHint">
                현재 플랜: <strong>{caps.planLabel}</strong> · 이번 달 사용량: {caps.monthlyUsed}
                {typeof caps.monthlyLimit === "number" ? ` / ${caps.monthlyLimit}` : ""}
              </p>
            ) : (
              <p className="hint muted dashboardPanelHint">지금은 저장 없이 분석만 진행됩니다. 로그인하면 저장 기능이 활성화됩니다.</p>
            )}

            <div className="dashboardInfoList">
              <div className="dashboardInfoListItem">1. 샘플 CSV로도 흐름 전체를 바로 테스트할 수 있습니다.</div>
              <div className="dashboardInfoListItem">2. 열 매핑은 자동 추정되지만, 리뷰 내용 열은 꼭 확인하세요.</div>
              <div className="dashboardInfoListItem">3. 분석 후 결과 탭에서 KPI와 액션 아이템이 카드로 정리됩니다.</div>
            </div>

            <div className="actionRow dashboardPanelActionRow">
              {caps?.supabaseConfigured === false ? null : (
                <a className="btn btnGhost" href="/dashboard/history">
                  저장된 리포트
                </a>
              )}
            </div>
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
            <div className="card previewEmptyState">
              <p className="sectionEyebrow">Step 2</p>
              <h2>열 매핑 패널이 이곳에 표시됩니다</h2>
              <p className="muted">CSV를 올리면 리뷰 내용, 별점, 작성일 열을 확인할 수 있는 미리보기 표가 열립니다.</p>
              <ul className="previewEmptyStateList">
                <li>헤더 유무를 자동 감지합니다.</li>
                <li>리뷰 텍스트 열을 우선 추천합니다.</li>
                <li>셀 전체보기와 복사 기능을 제공합니다.</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
