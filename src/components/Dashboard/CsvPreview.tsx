"use client";

import React from "react";
import { useMemo } from "react";
import type { CsvPreview as CsvPreviewType } from "@/lib/csv";
import CopyButton from "@/components/CopyButton";
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
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd());

  while (rawLines.length && rawLines[0] === "") rawLines.shift();
  while (rawLines.length && rawLines[rawLines.length - 1] === "") rawLines.pop();

  if (rawLines.length > 3) truncated = true;
  let out = rawLines.slice(0, 3).join("\n").trim();

  const maxChars = 140;
  if (out.length > maxChars) {
    truncated = true;
    out = out.slice(0, maxChars).trimEnd();
  }

  return truncated ? `${out}…` : out;
}

function normalizeColumnKey(c: string) {
  return c.trim().toLowerCase();
}

function isLikelyReviewTextColumn(c: string) {
  const normalized = normalizeColumnKey(c);
  if (!normalized) return false;
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

  const previewCols = useMemo(() => {
    return showAllPreviewCols ? preview.columns : preview.columns.slice(0, 6);
  }, [preview.columns, showAllPreviewCols]);

  const previewTableMinWidth = useMemo(() => {
    return Math.max(520, Math.min(previewCols.length * 140, 1100));
  }, [previewCols.length]);

  const previewTableWidthClass = previewTableMinWidth <= 520 ? "csvTableMin520"
    : previewTableMinWidth <= 660 ? "csvTableMin660"
      : previewTableMinWidth <= 800 ? "csvTableMin800"
        : previewTableMinWidth <= 940 ? "csvTableMin940"
          : "csvTableMin1100";

  const textColNeedsReview = useMemo(() => {
    const fallback = preview.inferred.textColSource === "fallback";
    return fallback;
  }, [preview.inferred.textColSource]);

  const reviewTextHint = useMemo(() => {
    if (textCol === "") return "";
    const candidates = preview.columns.filter((c) => isLikelyReviewTextColumn(c) && c !== textCol);
    return candidates.slice(0, 3).join(", ");
  }, [preview.columns, textCol]);

  return (
    <section className="mappingPanel mappingPanelBounded">
      <div className="mappingStatusRow">
        <span className="pill">{preview.totalRows}{t("preview.rows")} / {preview.columns.length}{t("preview.columns")}</span>
        <span className={`pill ${preview.headerMode === "header" ? "pillActive" : ""}`}>{preview.headerMode === "header" ? t("preview.headerPresent") : t("preview.headerAbsent")}</span>
      </div>

      <div className="csvPreview">
        <div className="card">
          <h2>{t("preview.mappingPanel")}</h2>
          {textColNeedsReview ? (
            <p className="hint danger csvPreviewWarning">
              {t("preview.autoInferredWarning")} <strong>{textCol}</strong>
              {reviewTextHint ? `\n${t("preview.possibleCols")} ${reviewTextHint}` : ""}
              <br />{t("preview.changeCol")}
            </p>
          ) : null}
          <div className="csvPreviewColumnGrid">
            <label>
              <span className="muted">
                {t("preview.reviewTextCol")}
                {textCol ? <span className="mappingStatus mappingStatusDone">{t("common.set")}</span> : <span className="mappingStatus mappingStatusRequired">{t("common.required")}</span>}
              </span>
              <select className="input" value={textCol} onChange={(e) => onTextColChange(e.target.value)} disabled={busy}>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="muted">
                {t("preview.ratingCol")}
                {ratingCol ? <span className="mappingStatus mappingStatusDone">{t("common.set")}</span> : null}
              </span>
              <select className="input" value={ratingCol} onChange={(e) => onRatingColChange(e.target.value)} disabled={busy}>
                <option value="">{t("common.none")}</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="muted">
                {t("preview.dateCol")}
                {dateCol ? <span className="mappingStatus mappingStatusDone">{t("common.set")}</span> : null}
              </span>
              <select className="input" value={dateCol} onChange={(e) => onDateColChange(e.target.value)} disabled={busy}>
                <option value="">{t("common.none")}</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="csvPreviewPreviewSection">
          <div className="csvPreviewPanelHeader">
            <span>{t("preview.previewFirst5")}</span>
            {preview.columns.length > 6 ? (
              <button
                type="button"
                className="btn btnSmall"
                onClick={onTogglePreviewCols}
                disabled={busy}
                aria-pressed={showAllPreviewCols}
              >
                {showAllPreviewCols ? t("preview.showFirst6") : t("preview.showAllCols")}
              </button>
            ) : null}
          </div>
          <div className="csvPreviewTableContainer">
          <div className="tableWrap csvPreviewTableWrap">
            <table className={`table ${previewTableWidthClass}`}>
              <thead>
                <tr>
                  {previewCols.map((c) => (
                    <th key={c} className={c === textCol ? "thMappedText" : c === ratingCol ? "thMappedRating" : c === dateCol ? "thMappedDate" : ""}>
                      {c}
                      {c === textCol ? <span className="thMappedLabel">{t("preview.text")}</span> : null}
                      {c === ratingCol ? <span className="thMappedLabel thMappedLabelRating">{t("preview.rating")}</span> : null}
                      {c === dateCol ? <span className="thMappedLabel thMappedLabelDate">{t("preview.date")}</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.sampleRows.slice(0, 5).map((r, idx) => (
                  <tr key={idx}>
                    {previewCols.map((c) => (
                      <td key={c}>
                        <button
                          type="button"
                          className="cellBtn"
                          title={String(r[c] ?? "")}
                          onClick={() => onCellClick(c, String(r[c] ?? ""))}
                        >
                          {renderCellPreview(r[c])}
                        </button>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
          {preview.columns.length > 6 && !showAllPreviewCols ? (
            <p className="hint muted">{t("preview.tooManyCols")}</p>
          ) : null}
        </div>
      </div>

      {preview.warnings?.length ? (
        <p className="hint muted csvPreviewTextWrap">{preview.warnings.join("\n")}</p>
      ) : null}

      {cellModal ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label={t("preview.cellFullView")}>
          <div className="modal">
            <div className="modalHeader">
              <div>
                <div className="muted">{t("common.fullView")}</div>
                <div className="csvPreviewModalCol">{cellModal.col}</div>
              </div>
              <div className="csvPreviewModalActions">
                <CopyButton text={cellModal.value} className="btn btnSmall btnPrimary" ariaLabel={t("preview.cellCopy")}>
                  {t("common.copyAll")}
                </CopyButton>
                <button type="button" className="btn btnSmall" onClick={onCellModalClose} aria-label={t("preview.cellModalClose")}>
                  {t("common.close")}
                </button>
              </div>
            </div>
            <div className="modalBody csvModalBody">{cellModal.value || <span className="muted">{t("common.emptyValue")}</span>}</div>
          </div>
          <button type="button" className="modalBackdrop" aria-label={t("preview.modalBackdropClose")} onClick={onCellModalClose} />
        </div>
      ) : null}
    </section>
  );
}
