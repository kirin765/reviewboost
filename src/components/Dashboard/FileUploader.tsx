"use client";

import React, { useRef, useState } from "react";
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
    <div>
      <p className="text-sm leading-7 text-[var(--rb-muted-strong)]">{t("upload.lead")}</p>

      <label
        htmlFor="dashboardCsvInput"
        className={`mt-5 flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-[18px] border border-dashed px-6 text-center transition ${
          dragActive ? "border-[color:rgba(95,198,183,0.36)] bg-[rgba(95,198,183,0.08)]" : "border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)]"
        }`}
        onDrop={onDropFile}
        onDragOver={onDragOver}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        role="button"
        aria-label={t("upload.csvFileUploadArea")}
      >
        <svg className="h-12 w-12 text-[var(--rb-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="mt-5 text-base font-medium tracking-[-0.02em] text-[var(--rb-fg)]">{t("upload.dropzone")}</p>
        <p className="mt-2 text-sm text-[var(--rb-muted)]">{t("upload.hint")}</p>
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

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onSample} disabled={busy}>
          {t("upload.sampleTest")}
        </Button>
        <Button variant="ghost" onClick={onReset} disabled={busy}>
          {t("upload.restart")}
        </Button>
      </div>

      <div className="mt-5 rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm text-[var(--rb-muted-strong)]" role="status" aria-live="polite">
        {file ? (
          <span>
            {t("upload.selected")} <code className="font-mono text-[var(--rb-fg)]">{file.name}</code> ({Math.round(file.size / 1024)} KB)
          </span>
        ) : (
          <span>{t("upload.noFileSelected")}</span>
        )}
      </div>

      <div className="mt-5">
        <Button variant="primary" onClick={onAnalyze} disabled={!file || busy} className="w-full justify-center" asLoading={busy}>
          {preview ? t("common.startAnalysis") : t("common.nextPreview")}
        </Button>
      </div>
    </div>
  );
}
