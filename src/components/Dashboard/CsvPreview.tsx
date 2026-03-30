"use client";

import React, { useMemo } from "react";
import CopyButton from "@/components/CopyButton";
import { buttonStyles } from "@/components/ui/Button";
import type { CsvPreview as CsvPreviewType } from "@/lib/csv";
import { useTranslation } from "@/lib/i18n";

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
  const { t } = useTranslation();

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
        <span className="rounded-full border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-[var(--rb-muted-strong)]">
          {preview.totalRows}
          {t("preview.rows")} / {preview.columns.length}
          {t("preview.columns")}
        </span>
        <span className="rounded-full border border-[color:rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-[var(--rb-muted-strong)]">
          {preview.headerMode === "header" ? t("preview.headerPresent") : t("preview.headerAbsent")}
        </span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[16px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-5">
          <h2 className="text-xl font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{t("preview.mappingPanel")}</h2>
          {textColNeedsReview ? (
            <p className="mt-4 whitespace-pre-line rounded-[14px] border border-[color:rgba(255,137,137,0.2)] bg-[rgba(123,22,22,0.18)] px-4 py-4 text-sm leading-7 text-[#ffc5c5]">
              {t("preview.autoInferredWarning")} <strong>{textCol}</strong>
              {reviewTextHint ? `\n${t("preview.possibleCols")} ${reviewTextHint}` : ""}
              <br />{t("preview.changeCol")}
            </p>
          ) : null}
          <div className="mt-5 grid gap-4">
            <label>
              <span className="mb-2 block text-sm text-[var(--rb-muted-strong)]">{t("preview.reviewTextCol")}</span>
              <select className="input" value={textCol} onChange={(e) => onTextColChange(e.target.value)} disabled={busy}>
                {preview.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm text-[var(--rb-muted-strong)]">{t("preview.ratingCol")}</span>
              <select className="input" value={ratingCol} onChange={(e) => onRatingColChange(e.target.value)} disabled={busy}>
                <option value="">{t("common.none")}</option>
                {preview.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm text-[var(--rb-muted-strong)]">{t("preview.dateCol")}</span>
              <select className="input" value={dateCol} onChange={(e) => onDateColChange(e.target.value)} disabled={busy}>
                <option value="">{t("common.none")}</option>
                {preview.columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-[16px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-[var(--rb-muted-strong)]">{t("preview.previewFirst5")}</span>
            {preview.columns.length > 6 ? (
              <button type="button" className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={onTogglePreviewCols} disabled={busy} aria-pressed={showAllPreviewCols}>
                {showAllPreviewCols ? t("preview.showFirst6") : t("preview.showAllCols")}
              </button>
            ) : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-[14px] border border-[color:rgba(255,255,255,0.06)]">
            <div className="tableWrap">
              <table className="min-w-[720px] text-left text-sm">
                <thead className="bg-[rgba(255,255,255,0.03)]">
                  <tr>
                    {previewCols.map((column) => (
                      <th key={column} className="px-4 py-3 font-medium text-[var(--rb-muted)]">
                        <div className="flex items-center gap-2">
                          <span>{column}</span>
                          {column === textCol ? <span className="rounded-full bg-[rgba(95,198,183,0.12)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--rb-accent)]">{t("preview.text")}</span> : null}
                          {column === ratingCol ? <span className="rounded-full bg-[rgba(95,198,183,0.12)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--rb-accent)]">{t("preview.rating")}</span> : null}
                          {column === dateCol ? <span className="rounded-full bg-[rgba(95,198,183,0.12)] px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[var(--rb-accent)]">{t("preview.date")}</span> : null}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.sampleRows.slice(0, 5).map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {previewCols.map((column) => (
                        <td key={column} className="px-4 py-3 align-top text-[var(--rb-muted-strong)]">
                          <button type="button" className="whitespace-pre-wrap text-left text-sm leading-6 hover:text-[var(--rb-fg)]" title={String(row[column] ?? "")} onClick={() => onCellClick(column, String(row[column] ?? ""))}>
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

          {preview.columns.length > 6 && !showAllPreviewCols ? <p className="mt-3 text-sm text-[var(--rb-muted)]">{t("preview.tooManyCols")}</p> : null}
          {preview.warnings?.length ? <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[var(--rb-muted)]">{preview.warnings.join("\n")}</p> : null}
        </div>
      </div>

      {cellModal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-5">
          <button type="button" className="absolute inset-0 bg-[rgba(0,0,0,0.62)] backdrop-blur-sm" aria-label={t("preview.modalBackdropClose")} onClick={onCellModalClose} />
          <div className="relative z-10 w-full max-w-2xl rounded-[18px] border border-[color:var(--rb-border)] bg-[rgba(11,15,16,0.96)] p-6 shadow-[0_28px_50px_rgba(0,0,0,0.38)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{t("common.fullView")}</p>
                <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{cellModal.col}</h3>
              </div>
              <div className="flex gap-3">
                <CopyButton text={cellModal.value} className={buttonStyles({ variant: "primary", size: "sm" })} ariaLabel={t("preview.cellCopy")}>
                  {t("common.copyAll")}
                </CopyButton>
                <button type="button" className={buttonStyles({ variant: "ghost", size: "sm" })} onClick={onCellModalClose} aria-label={t("preview.cellModalClose")}>
                  {t("common.close")}
                </button>
              </div>
            </div>
            <div className="mt-5 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4 text-sm leading-7 text-[var(--rb-muted-strong)]">
              {cellModal.value || <span className="text-[var(--rb-muted)]">{t("common.emptyValue")}</span>}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
