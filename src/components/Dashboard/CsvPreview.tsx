"use client";

import React, { useMemo } from "react";
import CopyButton from "@/components/CopyButton";
import { buttonStyles } from "@/components/ui/Button";
import type { CsvPreview as CsvPreviewType } from "@/lib/csv";

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

function renderCellPreview(v: unknown) {
  const raw = String(v ?? "");
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  let truncated = false;
  const rawLines = normalized
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd());

  while (rawLines.length && rawLines[0] === "") rawLines.shift();
  while (rawLines.length && rawLines[rawLines.length - 1] === "") rawLines.pop();

  if (rawLines.length > 3) truncated = true;
  let out = rawLines.slice(0, 3).join("\n").trim();

  if (out.length > 140) {
    truncated = true;
    out = out.slice(0, 140).trimEnd();
  }

  return truncated ? `${out}…` : out;
}

function normalizeColumnKey(value: string) {
  return value.trim().toLowerCase();
}

function isLikelyReviewTextColumn(value: string) {
  const normalized = normalizeColumnKey(value);
  return /review|comment|content|리뷰|후기|내용|텍스트/.test(normalized);
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
  const textColNeedsReview = preview.inferred.textColSource === "fallback";
  const reviewTextHint = useMemo(() => {
    if (textCol === "") return "";
    const candidates = preview.columns.filter((column) => isLikelyReviewTextColumn(column) && column !== textCol);
    return candidates.slice(0, 3).join(", ");
  }, [preview.columns, textCol]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <span className="rounded-full border border-[color:#e6e8f2] bg-white px-3 py-1 text-xs text-[var(--rb-muted-strong)]">
          {preview.totalRows}행 / {preview.columns.length}열
        </span>
        <span className="rounded-full border border-[color:#e6e8f2] bg-white px-3 py-1 text-xs text-[var(--rb-muted-strong)]">
          {preview.headerMode === "header" ? "헤더 있음" : "헤더 없음"}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[18px] border border-[color:#e6e8f2] bg-white p-5 shadow-[0_10px_30px_rgba(31,37,64,0.08)]">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">열 매핑 패널</h2>
          {textColNeedsReview ? (
            <p className="mt-4 whitespace-pre-line rounded-[14px] border border-[color:rgba(224,85,59,0.3)] bg-[rgba(224,85,59,0.08)] px-4 py-4 text-sm leading-7 text-[#b3411f]">
              리뷰 내용 열이 자동으로 추정되었는데 정확하지 않을 수 있어요. 지금 선택된 열: <strong>{textCol}</strong>
              {reviewTextHint ? `\n리뷰 텍스트 후보 열: ${reviewTextHint}` : ""}
              <br />원하는 열로 바꿔주세요.
            </p>
          ) : null}
          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-sm text-[var(--rb-muted-strong)]">리뷰 내용(텍스트) 열</span>
              <select className="input" value={textCol} onChange={(e) => onTextColChange(e.target.value)} disabled={busy}>
                {preview.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm text-[var(--rb-muted-strong)]">별점 열 (선택)</span>
              <select className="input" value={ratingCol} onChange={(e) => onRatingColChange(e.target.value)} disabled={busy}>
                <option value="">(없음)</option>
                {preview.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm text-[var(--rb-muted-strong)]">작성일 열 (선택)</span>
              <select className="input" value={dateCol} onChange={(e) => onDateColChange(e.target.value)} disabled={busy}>
                <option value="">(없음)</option>
                {preview.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-[18px] border border-[color:#e6e8f2] bg-white p-5 shadow-[0_10px_30px_rgba(31,37,64,0.08)]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-medium text-[var(--rb-muted-strong)]">미리보기 (처음 5줄)</span>
            {preview.columns.length > 6 ? (
              <button
                type="button"
                className={buttonStyles({ variant: "ghost", size: "sm" })}
                onClick={onTogglePreviewCols}
                disabled={busy}
                aria-pressed={showAllPreviewCols}
              >
                {showAllPreviewCols ? "앞의 6개만 보기" : "전체 열 보기"}
              </button>
            ) : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-[16px] border border-[color:#e6e8f2] bg-white">
            <div className="tableWrap bg-white">
              <table className="min-w-[720px] bg-white text-left text-sm text-[var(--rb-fg)]">
                <thead className="bg-[#f4f5fb]">
                  <tr>
                    {previewCols.map((column) => (
                      <th key={column} className="border-b border-[color:#e6e8f2] px-4 py-3 font-semibold text-[var(--rb-fg)]">
                        <div className="flex items-center gap-2">
                          <span>{column}</span>
                          {column === textCol ? <span className="rounded-full border border-[color:rgba(91,92,234,0.18)] bg-[rgba(91,92,234,0.12)] px-2 py-0.5 text-[10px] tracking-[0.16em] text-[var(--rb-accent)]">리뷰</span> : null}
                          {column === ratingCol ? <span className="rounded-full border border-[color:rgba(201,138,43,0.28)] bg-[rgba(201,138,43,0.1)] px-2 py-0.5 text-[10px] tracking-[0.16em] text-[var(--rb-warning)]">별점</span> : null}
                          {column === dateCol ? <span className="rounded-full border border-[color:rgba(91,92,234,0.22)] bg-[rgba(91,92,234,0.1)] px-2 py-0.5 text-[10px] tracking-[0.16em] text-[#4a4bd6]">작성일</span> : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {preview.sampleRows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex} className="bg-white transition hover:bg-[#eef0f8]">
                      {previewCols.map((column) => (
                        <td key={column} className="border-b border-[color:#e6e8f2] bg-white px-4 py-3 align-top text-[var(--rb-muted-strong)]">
                          <button
                            type="button"
                            className="whitespace-pre-wrap break-words text-left text-sm leading-6 text-[var(--rb-muted-strong)] transition hover:text-[var(--rb-fg)]"
                            title={String(row[column] ?? "")}
                            onClick={() => onCellClick(column, String(row[column] ?? ""))}
                          >
                            {renderCellPreview(row[column])}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {preview.columns.length > 6 && !showAllPreviewCols ? <p className="mt-3 text-sm text-[var(--rb-muted)]">열이 많아 앞의 6개만 표시합니다. 필요하면 전체 열 보기를 눌러주세요.</p> : null}
          {preview.warnings?.length ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--rb-muted)]">{preview.warnings.join("\n")}</p> : null}
        </div>
      </div>

      {cellModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-5">
          <button type="button" className="absolute inset-0 bg-[rgba(31,37,64,0.5)] backdrop-blur-sm" aria-label="모달 닫기" onClick={onCellModalClose} />
          <div className="relative z-10 w-full max-w-2xl rounded-[18px] border border-[color:var(--rb-border)] bg-white p-6 shadow-[0_10px_30px_rgba(31,37,64,0.08)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">전체 보기</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{cellModal.col}</h3>
              </div>
              <div className="flex gap-3">
                <CopyButton text={cellModal.value} className={buttonStyles({ variant: "primary", size: "sm" })} ariaLabel="셀 내용 전체 복사">
                  전체 복사
                </CopyButton>
                <button type="button" className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={onCellModalClose} aria-label="셀 모달 닫기">
                  닫기
                </button>
              </div>
            </div>
            <div className="mt-5 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-[14px] border border-[color:#e6e8f2] bg-white p-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
              {cellModal.value || <span className="text-[var(--rb-muted)]">비어 있음</span>}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
