"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import Button from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

interface FileUploaderProps {
  file: File | null;
  busy: boolean;
  preview: boolean;
  onFileSelect: (file: File | null) => void;
  onReset: () => void;
  onSample: () => void;
  onAnalyze: () => void;
}

export default function FileUploader({
  file,
  busy,
  preview,
  onFileSelect,
  onReset,
  onSample,
  onAnalyze
}: FileUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const { t } = useTranslation();

  function onDropFile(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    if (busy) return;
    const dropped = e.dataTransfer?.files?.[0] ?? null;
    onFileSelect(dropped);
  }

  function onDragOver(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
  }

  return (
    <div className="uploadBlock">
      <p className="heroLead">{t("upload.lead")}</p>

      <label
        htmlFor="dashboardCsvInput"
        className={`dropZone ${dragActive ? "dropZoneDragActive" : ""}`}
        onDrop={onDropFile}
        onDragOver={onDragOver}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        role="button"
        aria-label={t("upload.csvFileUploadArea")}
      >
        <svg className="dropZoneIcon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="dropZoneText">{t("upload.dropzone")}</p>
        <p className="hint">{t("upload.hint")}</p>
      </label>

      <input
        id="dashboardCsvInput"
        ref={fileInputRef}
        className="input"
        type="file"
        accept=".csv,text/csv"
        aria-label={t("upload.csvFileUpload")}
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFileSelect(f);
        }}
        disabled={busy}
        hidden
      />

      <div className="actionRow">
        <Button variant="ghost" onClick={onSample} disabled={busy}>
          {t("upload.sampleTest")}
        </Button>
        <Button onClick={onReset} disabled={busy}>
          {t("upload.restart")}
        </Button>
      </div>

      <div className="uploadStatus" role="status" aria-live="polite">
        {file ? (
          <span>
            {t("upload.selected")} <code>{file.name}</code> ({Math.round(file.size / 1024)} KB)
          </span>
        ) : (
          <span>{t("upload.noFileSelected")}</span>
        )}
      </div>

      <div className="toolbar">
        <Button variant="primary" onClick={onAnalyze} disabled={!file || busy} className={busy ? "btnLoading" : undefined}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {preview ? t("common.analyzing") : t("common.preparingPreview")}
            </>
          ) : preview ? t("common.startAnalysis") : t("common.nextPreview")}
        </Button>
      </div>

      {busy ? (
        <div className="loadingBar" role="progressbar" aria-label={t("upload.processing")}>
          <div className="loadingBarFill" />
        </div>
      ) : null}
    </div>
  );
}
