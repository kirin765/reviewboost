import { parse } from "csv-parse/sync";
import type { ReviewRow } from "@/lib/types";

const TEXT_KEYS = ["text", "review", "content", "comment", "리뷰", "내용", "후기", "텍스트", "리뷰내용", "후기내용"];
const RATING_KEYS = ["rating", "score", "star", "별점", "평점", "점수", "별", "stars"];
const DATE_KEYS = ["date", "created", "created_at", "time", "작성일", "등록일", "날짜", "일자"];

export type CsvHeaderMode = "header" | "headerless";

export type CsvMapping = {
  headerMode: CsvHeaderMode;
  textCol: string;
  ratingCol?: string | null;
  dateCol?: string | null;
};

export type CsvPreview = {
  headerMode: CsvHeaderMode;
  columns: string[];
  inferred: CsvMapping;
  sampleRows: Array<Record<string, string>>;
  totalRows: number;
  warnings: string[];
};

function normalizeKey(k: string) {
  return k.trim().toLowerCase();
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  if (n >= 0 && n <= 5) return n;
  if (n > 5 && n <= 10) return Math.round((n / 2) * 10) / 10;
  return null;
}

function toIsoDateOrNull(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Common formats: YYYY-MM-DD, YYYY.MM.DD, YYYY/MM/DD, ISO
  const normalized = s.replace(/\./g, "-").replace(/\//g, "-");
  const d = new Date(normalized);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toISOString();
}

function headersLookLikeData(headers: string[]): boolean {
  // If the "header" contains spaces / long Korean sentences, it's likely the first data row.
  return headers.some((h) => {
    const s = String(h ?? "").trim();
    if (!s) return false;
    if (s.length >= 24) return true;
    if (/\s/.test(s)) return true;
    if (/[가-힣]/.test(s) && s.length >= 8) return true;
    return false;
  });
}

function hasKnownHeader(headers: string[]): boolean {
  const keys = new Set(headers.map(normalizeKey));
  const textSet = new Set(TEXT_KEYS.map(normalizeKey));
  const ratingSet = new Set(RATING_KEYS.map(normalizeKey));
  const dateSet = new Set(DATE_KEYS.map(normalizeKey));
  for (const k of keys) {
    if (textSet.has(k) || ratingSet.has(k) || dateSet.has(k)) return true;
  }
  return false;
}

function inferMappingFromColumns(columns: string[], headerMode: CsvHeaderMode): CsvMapping {
  const headerMap = new Map<string, string>();
  for (const h of columns) headerMap.set(normalizeKey(h), h);

  const textCol =
    TEXT_KEYS.map((k) => headerMap.get(normalizeKey(k))).find(Boolean) ??
    // fallback: first column
    columns[0] ??
    "col1";

  const ratingCol =
    RATING_KEYS.map((k) => headerMap.get(normalizeKey(k))).find(Boolean) ??
    // fallback: second column if exists
    (columns.length >= 2 ? columns[1] : null);

  const dateCol =
    DATE_KEYS.map((k) => headerMap.get(normalizeKey(k))).find(Boolean) ??
    // fallback: third column if exists
    (columns.length >= 3 ? columns[2] : null);

  return { headerMode, textCol, ratingCol, dateCol };
}

function synthColumnsFromWidth(width: number): string[] {
  const cols: string[] = [];
  for (let i = 0; i < Math.max(1, width); i++) cols.push(`col${i + 1}`);
  return cols;
}

export function previewReviewCsv(csvText: string): CsvPreview {
  const warnings: string[] = [];

  // First attempt: parse as header CSV
  const headerRecords = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true
  }) as Record<string, unknown>[];

  if (headerRecords.length === 0) {
    return {
      headerMode: "header",
      columns: [],
      inferred: { headerMode: "header", textCol: "text", ratingCol: null, dateCol: null },
      sampleRows: [],
      totalRows: 0,
      warnings: ["CSV에 데이터가 없습니다."]
    };
  }

  const headerColumns = Object.keys(headerRecords[0] ?? {});
  const treatAsHeaderless = !hasKnownHeader(headerColumns) && headersLookLikeData(headerColumns);

  if (!treatAsHeaderless) {
    const inferred = inferMappingFromColumns(headerColumns, "header");
    const sampleRows = headerRecords.slice(0, 5).map((r) => {
      const out: Record<string, string> = {};
      for (const c of headerColumns) out[c] = String(r[c] ?? "");
      return out;
    });
    if (!hasKnownHeader(headerColumns)) {
      warnings.push("컬럼 이름을 자동으로 찾지 못해 1열=리뷰 내용, 2열=별점(있으면)으로 추정했습니다. 화면에서 확인해주세요.");
    }

    return {
      headerMode: "header",
      columns: headerColumns,
      inferred,
      sampleRows,
      totalRows: headerRecords.length,
      warnings
    };
  }

  warnings.push("첫 줄이 컬럼명이 아닌 것으로 보여 1열=리뷰 내용, 2열=별점(있으면)으로 처리합니다.");

  const rows = parse(csvText, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true
  }) as unknown[][];

  const width = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
  const columns = synthColumnsFromWidth(width);
  const inferred = inferMappingFromColumns(columns, "headerless");
  const sampleRows = rows.slice(0, 5).map((r) => {
    const out: Record<string, string> = {};
    for (let i = 0; i < columns.length; i++) out[columns[i]!] = String((r as any)?.[i] ?? "");
    return out;
  });

  return { headerMode: "headerless", columns, inferred, sampleRows, totalRows: rows.length, warnings };
}

export function parseReviewCsvWithMapping(csvText: string, mapping?: Partial<CsvMapping> | null): ReviewRow[] {
  const preview = previewReviewCsv(csvText);
  const m: CsvMapping = {
    ...preview.inferred,
    ...(mapping ?? {}),
    headerMode: (mapping?.headerMode ?? preview.inferred.headerMode) as CsvHeaderMode,
    textCol: String(mapping?.textCol ?? preview.inferred.textCol)
  };

  const ratingCol = m.ratingCol ? String(m.ratingCol) : null;
  const dateCol = m.dateCol ? String(m.dateCol) : null;

  if (m.headerMode === "header") {
    const records = parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      bom: true,
      trim: true
    }) as Record<string, unknown>[];

    return records
      .map((r) => {
        const text = String(r[m.textCol] ?? "").trim();
        const rating = ratingCol ? toNumberOrNull(r[ratingCol]) : null;
        const reviewedAt = dateCol ? toIsoDateOrNull(r[dateCol]) : null;
        return { text, rating, reviewedAt };
      })
      .filter((r) => r.text.length > 0);
  }

  const rows = parse(csvText, {
    columns: false,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true
  }) as unknown[][];

  const colIndex = (colName: string) => {
    const m = /^col(\d+)$/i.exec(colName.trim());
    if (!m) return -1;
    const idx = Number(m[1]) - 1;
    return Number.isFinite(idx) && idx >= 0 ? idx : -1;
  };

  const textIdx = colIndex(m.textCol);
  const ratingIdx = ratingCol ? colIndex(ratingCol) : -1;
  const dateIdx = dateCol ? colIndex(dateCol) : -1;

  return rows
    .map((r) => {
      const text = String((r as any)?.[textIdx] ?? "").trim();
      const rating = ratingIdx >= 0 ? toNumberOrNull((r as any)?.[ratingIdx]) : null;
      const reviewedAt = dateIdx >= 0 ? toIsoDateOrNull((r as any)?.[dateIdx]) : null;
      return { text, rating, reviewedAt };
    })
    .filter((r) => r.text.length > 0);
}
