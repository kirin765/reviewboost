"use client";

import { useRef } from "react";
import type { DragEvent } from "react";

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

  function onDropFile(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
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
        className="dropZone"
        onDrop={onDropFile}
        onDragOver={onDragOver}
        role="button"
        aria-label="CSV 파일 업로드 영역"
      >
        <div className="dropZoneIcon">⇪</div>
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
        <button className="btn btnWarn" onClick={onSample} disabled={busy}>
          샘플로 테스트
        </button>
        <button className="btn" onClick={onReset} disabled={busy}>
          새로 시작
        </button>
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
        <button className="btn btnPrimary" onClick={onAnalyze} disabled={!file || busy}>
          {busy ? "처리 중..." : preview ? "분석 시작" : "다음: 미리보기"}
        </button>
      </div>

      {busy ? (
        <p className="hint fileUploaderBusy">
          {preview ? "리뷰를 분석 중입니다. 잠시만 기다려주세요." : "CSV 미리보기를 준비하고 있습니다."}
        </p>
      ) : null}
    </div>
  );
}
