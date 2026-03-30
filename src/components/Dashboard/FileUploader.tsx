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

const TERMINAL_LINES = [
  "리뷰 수집 중...",
  "감정 분석 진행 중...",
  "카테고리 분류 중...",
  "우선순위 계산 중..."
];

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

  function onDropFile(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragActive(false);
    if (busy) return;
    onFileSelect(e.dataTransfer?.files?.[0] ?? null);
  }

  return (
    <div className="space-y-5">
      <button
        type="button"
        className={`flex min-h-[220px] w-full flex-col items-center justify-center rounded-[18px] border border-dashed px-6 text-center transition ${
          dragActive ? "border-[var(--color-primary)] bg-[rgba(91,108,255,0.08)]" : "border-white/14 bg-white/[0.03]"
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={onDropFile}
        onDragOver={(event) => event.preventDefault()}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 text-white">
          CSV
        </div>
        <div className="mt-5 text-lg font-medium text-[var(--color-text)]">CSV 업로드 또는 드래그 앤 드롭</div>
        <div className="mt-2 max-w-sm text-sm leading-6 text-[var(--color-muted)]">
          쿠팡 또는 스마트스토어 리뷰 CSV를 올리면 바로 컬럼을 확인하고 분석 단계로 이어집니다.
        </div>
      </button>

      <input
        ref={fileInputRef}
        className="hidden"
        type="file"
        accept=".csv,text/csv"
        onChange={(e) => onFileSelect(e.target.files?.[0] ?? null)}
        disabled={busy}
      />

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" onClick={onAnalyze} disabled={!file || busy}>
          {busy ? (preview ? "분석 중..." : "미리보기 준비 중...") : preview ? "리뷰 분석" : "미리보기 확인"}
        </Button>
        <Button onClick={onSample} disabled={busy}>샘플로 체험</Button>
        <Button variant="ghost" onClick={onReset} disabled={busy}>초기화</Button>
      </div>

      <div className="rounded-[18px] border border-white/10 bg-[rgba(245,239,230,0.03)] p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Selected file</div>
            <div className="mt-2 text-sm text-[var(--color-text)]">{file ? file.name : "선택된 파일이 없습니다."}</div>
          </div>
          {file ? <div className="text-sm text-[var(--color-muted)]">{Math.round(file.size / 1024)} KB</div> : null}
        </div>
      </div>

      <div className="rounded-[18px] border border-white/10 bg-[#0b0e10] p-4 font-mono text-sm">
        {TERMINAL_LINES.map((line, index) => (
          <div
            key={line}
            className={`${index === 0 ? "" : "mt-2"} ${busy && index < (preview ? 4 : 2) ? "text-white" : "text-[var(--color-muted)]"}`}
          >
            {line}
          </div>
        ))}
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
          <div
            className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500"
            style={{ width: busy ? (preview ? "78%" : "34%") : file ? (preview ? "42%" : "20%") : "8%" }}
          />
        </div>
        <div className="mt-3 text-xs text-[var(--color-muted)]">최대 5분 정도 걸릴 수 있습니다.</div>
      </div>
    </div>
  );
}
