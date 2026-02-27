"use client";

import { useRef, useState } from "react";
import type { DragEvent } from "react";
import Button from "@/components/ui/Button";

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
      <p className="heroLead">리뷰 CSV 업로드를 먼저 진행한 뒤 바로 미리보기를 확인하세요.</p>

      <label
        htmlFor="dashboardCsvInput"
        className={`dropZone ${dragActive ? "dropZoneDragActive" : ""}`}
        onDrop={onDropFile}
        onDragOver={onDragOver}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
        role="button"
        aria-label="CSV 파일 업로드 영역"
      >
        <svg className="dropZoneIcon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="dropZoneText">클릭 또는 파일을 이곳에 드롭하세요</p>
        <p className="hint">지원 형식: .csv</p>
      </label>

      <input
        id="dashboardCsvInput"
        ref={fileInputRef}
        className="input"
        type="file"
        accept=".csv,text/csv"
        aria-label="CSV 파일 업로드"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFileSelect(f);
        }}
        disabled={busy}
        hidden
      />

      <div className="actionRow">
        <Button variant="ghost" onClick={onSample} disabled={busy}>
          샘플로 테스트
        </Button>
        <Button onClick={onReset} disabled={busy}>
          새로 시작
        </Button>
      </div>

      <div className="uploadStatus" role="status" aria-live="polite">
        {file ? (
          <span>
            선택됨: <code>{file.name}</code> ({Math.round(file.size / 1024)} KB)
          </span>
        ) : (
          <span>아직 파일이 선택되지 않았습니다.</span>
        )}
      </div>

      <div className="toolbar">
        <Button variant="primary" onClick={onAnalyze} disabled={!file || busy} className={busy ? "btnLoading" : undefined}>
          {busy ? (
            <>
              <span className="spinner" aria-hidden="true" />
              {preview ? "분석 중..." : "미리보기 준비 중..."}
            </>
          ) : preview ? "분석 시작" : "다음: 미리보기"}
        </Button>
      </div>

      {busy ? (
        <div className="loadingBar" role="progressbar" aria-label="처리 중">
          <div className="loadingBarFill" />
        </div>
      ) : null}
    </div>
  );
}
