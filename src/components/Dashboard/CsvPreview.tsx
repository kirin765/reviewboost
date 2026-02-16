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

  const maxChars = 180;
  if (out.length > maxChars) {
    truncated = true;
    out = out.slice(0, maxChars).trimEnd();
  }

  return truncated ? `${out}…` : out;
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
    return Math.max(520, previewCols.length * 140);
  }, [previewCols.length]);

  return (
    <div style={{ marginTop: 12 }}>
      <div className="pill">
        행 {preview.totalRows} · 컬럼 {preview.columns.length} · {preview.headerMode === "header" ? "헤더 있음" : "헤더 없음"}
      </div>
      <div className="hint" style={{ marginTop: 10 }}>
        <div style={{ display: "grid", gap: 10 }}>
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
            <span className="muted">작성일 열 (선택, 최근 이슈 확인용)</span>
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
      <div style={{ marginTop: 12 }}>
        <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <span>미리보기 (처음 몇 줄)</span>
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
        <p className="hint muted" style={{ marginTop: 6, marginBottom: 0 }}>
          셀을 클릭하면 전체 내용을 볼 수 있습니다.
        </p>
        <div className="tableWrap" style={{ marginTop: 8 }}>
          <table className="table" style={{ minWidth: previewTableMinWidth }}>
            <thead>
              <tr>
                {previewCols.map((c) => (
                  <th key={c}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.sampleRows.map((r, idx) => (
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
      {preview.warnings?.length ? (
        <p className="hint muted" style={{ whiteSpace: "pre-wrap" }}>
          {preview.warnings.join("\n")}
        </p>
      ) : null}

      {cellModal ? (
        <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="셀 전체보기">
          <div className="modal">
            <div className="modalHeader">
              <div>
                <div className="muted">전체보기</div>
                <div style={{ fontWeight: 800 }}>{cellModal.col}</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <CopyButton text={cellModal.value} className="btn btnSmall btnPrimary">
                  전체 복사
                </CopyButton>
                <button type="button" className="btn btnSmall" onClick={onCellModalClose}>
                  닫기
                </button>
              </div>
            </div>
            <div className="modalBody" style={{ whiteSpace: "pre-wrap" }}>
              {cellModal.value || <span className="muted">(빈 값)</span>}
            </div>
          </div>
          <button type="button" className="modalBackdrop" aria-label="닫기" onClick={onCellModalClose} />
        </div>
      ) : null}
    </div>
  );
}
