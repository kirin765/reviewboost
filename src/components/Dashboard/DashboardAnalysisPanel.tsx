"use client";

import type { Capabilities } from "@/lib/capabilities";
import type { CsvPreview } from "@/lib/csv";
import FileUploader from "./FileUploader";
import CsvPreviewComponent from "./CsvPreview";
import AnalysisStepList from "./AnalysisStepList";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();

  const infoCards = [
    {
      label: t("panel.uploadStatus"),
      value: file ? file.name : t("panel.noFile"),
      meta: file ? `${Math.round(file.size / 1024)} KB` : t("panel.addCsv")
    },
    {
      label: t("panel.previewLabel"),
      value: preview ? `${preview.totalRows}${t("preview.rows")}` : t("panel.previewWaiting"),
      meta: preview ? `${preview.columns.length}${t("panel.colsDetected")}` : t("panel.colsEstimateHint")
    },
    {
      label: t("panel.savePlan"),
      value: caps?.planLabel ?? "Guest mode",
      meta: caps?.supabaseConfigured === false ? t("panel.storageOff") : t("panel.storageOrPdf")
    }
  ];

  return (
    <section className="dashboardPanel dashboardAnalysisPanel" id="analysis-panel" role="tabpanel" aria-labelledby="analysis-tab">
      <div className="dashboardSectionHeader">
        <div>
          <p className="sectionEyebrow">Upload and map</p>
          <h1 className="dashboardSectionTitle">{t("panel.csvAnalysis")}</h1>
          <p className="dashboardSectionLead">{t("panel.csvAnalysisLead")}</p>
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
                <h2>{t("panel.fileUpload")}</h2>
              </div>
              <span className="pill pillActive">CSV only</span>
            </div>
            <FileUploader file={file} busy={busy} preview={Boolean(preview)} onFileSelect={onFileSelect} onReset={onReset} onSample={onSample} onAnalyze={onAnalyze} />
          </div>

          <div className="card surfaceCard dashboardInfoCard">
            <div className="dashboardSubsectionHeader">
              <div>
                <p className="sectionEyebrow">Workspace notes</p>
                <h2>{t("panel.workspaceNotes")}</h2>
              </div>
            </div>

            {caps?.supabaseConfigured === false ? (
              <div className="actionRow dashboardPanelHint" role="note">
                <p className="hint muted">{t("panel.storageOffHint")}</p>
              </div>
            ) : caps ? (
              <p className="hint muted dashboardPanelHint">
                {t("panel.currentPlan")} <strong>{caps.planLabel}</strong> · {t("panel.monthlyUsage")} {caps.monthlyUsed}
                {typeof caps.monthlyLimit === "number" ? ` / ${caps.monthlyLimit}` : ""}
              </p>
            ) : (
              <p className="hint muted dashboardPanelHint">{t("panel.noStorageHint")}</p>
            )}

            <div className="dashboardInfoList">
              <div className="dashboardInfoListItem">{t("panel.info1")}</div>
              <div className="dashboardInfoListItem">{t("panel.info2")}</div>
              <div className="dashboardInfoListItem">{t("panel.info3")}</div>
            </div>

            <div className="actionRow dashboardPanelActionRow">
              {caps?.supabaseConfigured === false ? null : (
                <a className="btn btnGhost" href="/dashboard/history">
                  {t("panel.savedReports")}
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
              <h2>{t("panel.step2Title")}</h2>
              <p className="muted">{t("panel.step2Desc")}</p>
              <ul className="previewEmptyStateList">
                <li>{t("panel.step2Feature1")}</li>
                <li>{t("panel.step2Feature2")}</li>
                <li>{t("panel.step2Feature3")}</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
