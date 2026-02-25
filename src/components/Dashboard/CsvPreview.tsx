"use client";

import React from "react";
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
  const previewCols = useMemo(() => {
    return showAllPreviewCols ? preview.columns : preview.columns.slice(0, 6);
  }, [preview.columns, showAllPreviewCols]);

  const previewTableMinWidth = useMemo(() => {
    return Math.max(520, Math.min(previewCols.length * 140, 1100));
  }, [previewCols.length]);

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
    <section className="mappingPanel">
      <div className="rowActions" style={{ justifyContent: "space-between", marginBottom: 12 }}>
        <span>매핑 상태: {preview.totalRows}행 / {preview.columns.length}컬럼</span>
        <span className={`pill ${preview.headerMode === "header" ? "pillActive" : ""}`}>헤더 {preview.headerMode === "header" ? "있음" : "없음"}</span>
      </div>

      <div className="csvPreview">
        <div className="card">
          <h2>열 매핑 패널</h2>
          {textColNeedsReview ? (
            <p className="hint danger csvPreviewWarning">
              리뷰 내용 열이 자동 추정되었으나 확실하지 않습니다. 현재 선택: <strong>{textCol}</strong>
              {reviewTextHint ? `\n다음 열에 리뷰 텍스트가 있을 가능성이 있어요: ${reviewTextHint}` : ""}
              <br />원하는 열로 변경해 주세요.
            </p>
          ) : null}
          <div className="csvPreviewColumnGrid">
            <label>
              <span className="muted">리뷰 내용(텍스트) 열</span>
              <select className="input" value={textCol} onChange={(e) => onTextColChange(e.target.value)} disabled={busy}>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="muted">별점 열 (선택)</span>
              <select className="input" value={ratingCol} onChange={(e) => onRatingColChange(e.target.value)} disabled={busy}>
                <option value="">(없음)</option>
                {preview.columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="muted">작성일 열 (선택)</span>
              <select className="input" value={dateCol} onChange={(e) => onDateColChange(e.target.value)} disabled={busy}>
                <option value="">(없음)</option>
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
            <span>미리보기 (처음 5줄)</span>
            {preview.columns.length > 6 ? (
              <button
                type="button"
                className="btn btnSmall"
                onClick={onTogglePreviewCols}
                disabled={busy}
                aria-pressed={showAllPreviewCols}
              >
                {showAllPreviewCols ? "앞의 6개만 보기" : "전체 컬럼 보기"}
              </button>
            ) : null}
          </div>
          <p className="hint muted tableHint">가로 스크롤 시 전체 열을 좌우로 확인하세요.</p>

          <div className="tableWrap csvPreviewTableWrap">
            <table className="table" style={{ minWidth: previewTableMinWidth }}>
              <thead>
                <tr>
                  {previewCols.map((c) => (
                    <th key={c}>{c}</th>
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
          {preview.columns.length > 6 && !showAllPreviewCols ? (
            <p className="hint muted">컬럼이 많아 앞의 6개만 표시합니다. (전체 컬럼 보기 가능)</p>
          ) : null}
        </div>
      </div>

      {preview.warnings?.length ? (
        <p className="hint muted csvPreviewTextWrap">{preview.warnings.join("\n")}</p>
      ) : null}

      {cellModal ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="셀 전체보기">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <div className="muted">전체보기</div>
                <div className="csvPreviewModalCol">{cellModal.col}</div>
              </div>
              <div className="csvPreviewModalActions">
                <CopyButton text={cellModal.value} className="btn btnSmall btnPrimary" ariaLabel="셀 내용 전체 복사">
                  전체 복사
                </CopyButton>
                <button type="button" className="btn btnSmall" onClick={onCellModalClose} aria-label="셀 모달 닫기">
                  닫기
                </button>
              </div>
            </div>
            <div className="modalBody csvModalBody">{cellModal.value || <span className="muted">(빈 값)</span>}</div>
          </div>
          <button type="button" className="modalBackdrop" aria-label="모달 배경 닫기" onClick={onCellModalClose} />
        </div>
      ) : null}
    </section>
  );
}
