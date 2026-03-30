"use client";

import { useMemo } from "react";
import type { CsvPreview as CsvPreviewType } from "@/lib/csv";
import CopyButton from "@/components/CopyButton";

interface CsvPreviewProps {
  preview: CsvPreviewType;
  busy: boolean;
  textCol: string;
  ratingCol: string;
  dateCol: string;
  showAllPreviewCols: boolean;
  cellModal: { col: string; value: string } | null;
  onTextColChange: (col: string) => void;
  onRatingColChange: (col: string) => void;
  onDateColChange: (col: string) => void;
  onTogglePreviewCols: () => void;
  onCellClick: (col: string, value: string) => void;
  onCellModalClose: () => void;
}

function renderCellPreview(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  if (text.length <= 88) return text;
  return `${text.slice(0, 88).trimEnd()}...`;
}

function SelectField({
  label,
  value,
  options,
  onChange,
  busy,
  optional = false
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  busy: boolean;
  optional?: boolean;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">{label}</span>
      <select
        className="w-full rounded-[14px] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-[var(--color-text)] outline-none transition focus:border-[var(--color-primary)]"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={busy}
      >
        {optional ? <option value="">없음</option> : null}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function CsvPreview({
  preview,
  busy,
  textCol,
  ratingCol,
  dateCol,
  showAllPreviewCols,
  cellModal,
  onTextColChange,
  onRatingColChange,
  onDateColChange,
  onTogglePreviewCols,
  onCellClick,
  onCellModalClose
}: CsvPreviewProps) {
  const previewCols = useMemo(() => (showAllPreviewCols ? preview.columns : preview.columns.slice(0, 6)), [preview.columns, showAllPreviewCols]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
        <span className="rounded-full border border-white/10 px-3 py-1.5">{preview.totalRows} rows</span>
        <span className="rounded-full border border-white/10 px-3 py-1.5">{preview.columns.length} columns</span>
        <span className="rounded-full border border-white/10 px-3 py-1.5">{preview.headerMode === "header" ? "Header detected" : "No header"}</span>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[20px] border border-white/10 bg-[rgba(245,239,230,0.03)] p-5">
          <div className="text-sm font-medium text-[var(--color-text)]">컬럼 매핑</div>
          <div className="mt-5 space-y-4">
            <SelectField label="리뷰 텍스트" value={textCol} options={preview.columns} onChange={onTextColChange} busy={busy} />
            <SelectField label="평점 컬럼" value={ratingCol} options={preview.columns} onChange={onRatingColChange} busy={busy} optional />
            <SelectField label="날짜 컬럼" value={dateCol} options={preview.columns} onChange={onDateColChange} busy={busy} optional />
          </div>
          {preview.warnings?.length ? (
            <div className="mt-5 rounded-[16px] border border-[var(--color-warning)]/30 bg-[var(--color-warning-bg)] p-4 text-sm leading-6 text-[var(--color-text)]/86">
              {preview.warnings.join(" ")}
            </div>
          ) : null}
        </div>

        <div className="rounded-[20px] border border-white/10 bg-[rgba(245,239,230,0.03)] p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-[var(--color-text)]">미리보기</div>
              <div className="mt-1 text-sm text-[var(--color-muted)]">처음 5개 리뷰를 기준으로 컬럼 구성을 확인합니다.</div>
            </div>
            {preview.columns.length > 6 ? (
              <button
                type="button"
                className="rounded-[12px] border border-white/10 px-3 py-2 text-xs text-[var(--color-text)]"
                onClick={onTogglePreviewCols}
                disabled={busy}
              >
                {showAllPreviewCols ? "6개만 보기" : "전체 컬럼 보기"}
              </button>
            ) : null}
          </div>

          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
              <thead>
                <tr>
                  {previewCols.map((column) => {
                    const isMapped = column === textCol || column === ratingCol || column === dateCol;

                    return (
                      <th
                        key={column}
                        className={`border-b border-white/10 px-3 py-3 font-medium ${isMapped ? "text-white" : "text-[var(--color-text)]"}`}
                      >
                        {column}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.slice(0, 5).map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {previewCols.map((column) => (
                      <td key={column} className="border-b border-white/6 px-3 py-3 align-top text-[var(--color-muted)]">
                        <button
                          type="button"
                          className="max-w-[220px] text-left leading-6 text-[var(--color-text)]/86 transition hover:text-[var(--color-text)]"
                          title={String(row[column] ?? "")}
                          onClick={() => onCellClick(column, String(row[column] ?? ""))}
                        >
                          {renderCellPreview(row[column]) || "-"}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {cellModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="relative z-10 w-full max-w-2xl rounded-[18px] border border-white/10 bg-[rgba(17,20,23,0.96)] p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.22em] text-[var(--color-muted)]">Full cell value</div>
                <div className="mt-2 text-lg font-medium text-[var(--color-text)]">{cellModal.col}</div>
              </div>
              <div className="flex gap-2">
                <CopyButton
                  text={cellModal.value}
                  className="inline-flex items-center justify-center rounded-[12px] bg-[var(--color-primary)] px-4 py-2 text-sm font-semibold text-white"
                >
                  전체 복사
                </CopyButton>
                <button
                  type="button"
                  className="rounded-[12px] border border-white/10 px-4 py-2 text-sm text-[var(--color-text)]"
                  onClick={onCellModalClose}
                >
                  닫기
                </button>
              </div>
            </div>
            <div className="mt-5 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-[14px] border border-white/8 bg-black/20 p-4 text-sm leading-7 text-[var(--color-text)]/88">
              {cellModal.value || "비어 있습니다."}
            </div>
          </div>
          <button type="button" className="absolute inset-0" onClick={onCellModalClose} aria-label="닫기" />
        </div>
      ) : null}
    </section>
  );
}
