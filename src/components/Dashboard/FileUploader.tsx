"use client";

import { useRef } from "react";

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

  return (
    <>
      <p className="heroLead">
        리뷰 내용이 들어있는 CSV 파일을 올려주세요. 샘플로 먼저 테스트해도 됩니다:{" "}
        <a className="link" href="/sample.csv" download>
          샘플 CSV 다운로드
        </a>
      </p>
      <div className="toolbar">
        <button className="btn btnWarn" onClick={onSample} disabled={busy}>
          샘플로 테스트
        </button>
        <button className="btn" onClick={onReset} disabled={busy}>
          새로 시작
        </button>
      </div>
      <input
        ref={fileInputRef}
        className="input"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          onFileSelect(f);
        }}
        disabled={busy}
      />
      <div className="hint">
        {file ? (
          <span>
            선택됨: <code>{file.name}</code> ({Math.round(file.size / 1024)} KB)
          </span>
        ) : (
          <span>CSV 파일을 선택하세요.</span>
        )}
      </div>
      <div className="toolbar">
        <button className="btn btnPrimary" onClick={onAnalyze} disabled={!file || busy}>
          {busy ? "처리 중..." : preview ? "분석 시작" : "다음: 미리보기"}
        </button>
      </div>
      {busy ? (
        <p className="hint" style={{ marginTop: 6 }}>
          {preview ? "리뷰를 분석 중입니다. 잠시만 기다려주세요." : "CSV 미리보기를 준비하고 있습니다."}
        </p>
      ) : null}
    </>
  );
}
