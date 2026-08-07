import { parse } from "csv-parse/sync";
import type { ReviewRow } from "@/lib/types";

const TEXT_KEYS = [
  "text",
  "review",
  "content",
  "comment",
  "review_text",
  "reviewtext",
  "review content",
  "content_text",
  "comment_text",
  "review_content",
  "후기내용",
  "리뷰내용",
  "리뷰본문",
  "텍스트",
  "내용"
];
const RATING_KEYS = ["rating", "score", "star", "별점", "평점", "점수", "별", "stars"];
const DATE_KEYS = ["date", "created", "created_at", "time", "작성일", "등록일", "날짜", "일자"];

export type CsvHeaderMode = "header" | "headerless";

export type CsvMapping = {
  headerMode: CsvHeaderMode;
  textCol: string;
  textColSource?: "explicit" | "fallback";
  ratingCol?: string | null;
  dateCol?: string | null;
};

export type CsvPreview = {
  filename: string | null;
  headerMode: CsvHeaderMode;
  columns: string[];
  inferred: CsvMapping;
  sampleRows: Array<Record<string, string>>;
  totalRows: number;
  warnings: string[];
};

export function inferDelimiter(csvText: string): "," | ";" | "\t" {
  // Naive delimiter inference to reduce "one giant column" CSVs coming from locale settings.
  // We look at a few lines and count common separators.
  const lines = csvText.split(/\r?\n/).slice(0, 10).filter((l) => l.trim().length > 0);
  const count = (d: string) => lines.reduce((acc, l) => acc + (l.split(d).length - 1), 0);
  const comma = count(",");
  const semi = count(";");
  const tab = count("\t");

  // Prefer the dominant delimiter, but keep comma as default.
  if (tab >= 3 && tab > comma * 2 && tab > semi * 2) return "\t";
  if (semi >= 3 && semi > comma * 2) return ";";
  return ",";
}

function normalizeKey(k: string) {
  return k.trim().toLowerCase();
}

function isLikelyReviewTextColumn(name: string) {
  const key = normalizeKey(name);
  return (
    TEXT_KEYS.map((k) => normalizeKey(k)).includes(key) ||
    /리뷰|후기|내용|텍스트/.test(name) ||
    /review.?text|review.?content|comment.?text|review/.test(normalizeKey(name))
  );
}

function isLikelyIdColumn(name: string) {
  const normalized = normalizeKey(name);
  if (!normalized) return false;
  return normalized === "id" || /(^|[._\-\s])id$|[._\-\s]id([._\-\s]|$)/.test(normalized);
}

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  let n = Number(s);
  if (!Number.isFinite(n)) {
    // 쿠팡/스마트스토어 내보내기의 "5점", "★5" 같은 표기에서 숫자만 추출
    const m = s.match(/-?\d+(?:\.\d+)?/);
    if (!m) return null;
    n = Number(m[0]);
  }
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

// Match a column whose normalized name contains a keyword token (e.g. "review_date" ⊃ "date"),
// so prefixed headers aren't missed and fall through to a wrong positional guess.
function findColumnByKeyword(columns: string[], keys: string[]): string | undefined {
  const normCols = columns.map((c) => ({ col: c, norm: normalizeKey(c) }));
  for (const key of keys) {
    const nk = normalizeKey(key);
    const hit = normCols.find(({ norm }) => norm.includes(nk));
    if (hit) return hit.col;
  }
  return undefined;
}

function inferMappingFromColumns(columns: string[], headerMode: CsvHeaderMode): CsvMapping {
  const headerMap = new Map<string, string>();
  for (const h of columns) headerMap.set(normalizeKey(h), h);

  const textColExplicit = TEXT_KEYS.map((k) => headerMap.get(normalizeKey(k))).find(Boolean);
  const textCol =
    textColExplicit ??
    // fallback: first non-id column, then first column
    columns.filter((c) => !isLikelyIdColumn(c))[0] ??
    columns[0] ??
    "col1";
  const textColSource: CsvMapping["textColSource"] = textColExplicit ? "explicit" : "fallback";

  const ratingCol =
    RATING_KEYS.map((k) => headerMap.get(normalizeKey(k))).find(Boolean) ??
    findColumnByKeyword(columns, RATING_KEYS) ??
    // fallback: second column if exists
    (columns.length >= 2 ? columns[1] : null);

  const dateCol =
    DATE_KEYS.map((k) => headerMap.get(normalizeKey(k))).find(Boolean) ??
    findColumnByKeyword(columns, DATE_KEYS) ??
    // positional guess only makes sense for headerless CSVs; in header mode a wrong
    // guess silently maps a non-date column and breaks recency analysis.
    (headerMode === "headerless" && columns.length >= 3 ? columns[2] : null);

  return { headerMode, textCol, textColSource, ratingCol, dateCol };
}

function synthColumnsFromWidth(width: number): string[] {
  const cols: string[] = [];
  for (let i = 0; i < Math.max(1, width); i++) cols.push(`col${i + 1}`);
  return cols;
}

export function previewReviewCsv(csvText: string, filename: string | null = null): CsvPreview {
  const warnings: string[] = [];
  const delimiter = inferDelimiter(csvText);
  if (delimiter !== ",") {
    warnings.push(
      `구분자가 '${delimiter === "\t" ? "TAB" : delimiter}' 로 감지되었습니다. 엑셀에서 'CSV(쉼표로 구분)' 또는 'CSV UTF-8'로 저장하면 가장 안정적입니다.`
    );
  }

  // First attempt: parse as header CSV
  const headerRecords = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    bom: true,
    trim: true,
    delimiter
  }) as Record<string, unknown>[];

  if (headerRecords.length === 0) {
    return {
      filename,
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
      for (const c of headerColumns) {
        out[c] = String((r as Record<string, unknown>)[c] ?? "");
      }
      return out;
    });

    if (inferred.textColSource === "fallback") {
      if (isLikelyIdColumn(inferred.textCol)) {
        warnings.push(
          `리뷰 본문 열을 자동 감지하지 못해 '${inferred.textCol}'(ID/코드형) 컬럼을 임시로 선택했습니다. 샘플처럼 'review_text' 같은 열이 보이면 반드시 텍스트 열로 변경해 주세요.`
        );
      } else {
        const likelyTextHint = headerColumns.find((c) => isLikelyReviewTextColumn(c));
        warnings.push(
          `리뷰 내용 열을 자동으로 찾지 못해 '${inferred.textCol}'을 임시 선택했습니다. ${likelyTextHint ? `'${likelyTextHint}'` : "컬럼"}가 리뷰 본문일 수 있으니 꼭 확인해주세요.`
        );
      }
    }

    if (!hasKnownHeader(headerColumns)) {
      warnings.push("컬럼 이름을 자동으로 찾지 못해 1열=리뷰 내용, 2열=별점(있으면)으로 추정했습니다. 화면에서 확인해주세요.");
    }

    return {
      filename,
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
    trim: true,
    delimiter
  }) as unknown[][];

  const width = Math.max(...rows.map((r) => (Array.isArray(r) ? r.length : 0)));
  const columns = synthColumnsFromWidth(width);
  const inferred = inferMappingFromColumns(columns, "headerless");
  const sampleRows = rows.slice(0, 5).map((r) => {
    const out: Record<string, string> = {};
    const values = Array.isArray(r) ? r : [];
    for (let i = 0; i < columns.length; i++) {
      const key = columns[i];
      if (!key) continue;
      out[key] = String(values[i] ?? "");
    }
    return out;
  });

  return { filename, headerMode: "headerless", columns, inferred, sampleRows, totalRows: rows.length, warnings };
}

export function parseReviewCsvWithMapping(csvText: string, mapping?: Partial<CsvMapping> | null): ReviewRow[] {
  const preview = previewReviewCsv(csvText);
  const m: CsvMapping = {
    ...preview.inferred,
    ...(mapping ?? {}),
    headerMode: mapping?.headerMode ?? preview.inferred.headerMode,
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
      trim: true,
      delimiter: inferDelimiter(csvText)
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
    trim: true,
    delimiter: inferDelimiter(csvText)
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
      const row = Array.isArray(r) ? r : [];
      const text = String((textIdx >= 0 ? row[textIdx] : undefined) ?? "").trim();
      const rating = ratingIdx >= 0 ? toNumberOrNull(row[ratingIdx]) : null;
      const reviewedAt = dateIdx >= 0 ? toIsoDateOrNull(row[dateIdx]) : null;
      return { text, rating, reviewedAt };
    })
    .filter((r) => r.text.length > 0);
}
