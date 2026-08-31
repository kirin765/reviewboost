import { strToU8, zipSync } from "fflate";
import {
  OFFICIAL_NUMERIC_COLUMNS,
  reviewToOfficialRow,
  SMARTSTORE_REVIEW_HEADERS,
  type ReviewExportContext
} from "./excel-form";
import type { RawReview } from "./types";

/**
 * 스마트스토어 판매자센터 "리뷰관리 → 엑셀 다운로드" 공식 파일 폼을 그대로 재현하는 .xlsx 생성기.
 * 참조: ~/Downloads/review_20260831_174028.xlsx (판매자센터 실측 캡처, 2026-08-31) —
 * 시트명 Sheet0, sharedStrings 방식, 굵은 노랑 헤더(FFFF99)+테두리, 데이터 셀 테두리+wrap,
 * 25열 폭, 데이터 행 높이 50, docProps(creator MyApplication).
 * 숫자 열(구매자평점·리뷰도움수·리뷰글번호)은 t="n", 빈 셀은 스타일만 있는 <c s="2"/>.
 */

/** 공식 시트명 (판매자센터 내보내기 실측). */
export const SMARTSTORE_SHEET_NAME = "Sheet0";

/** 공식 내보내기의 25열 폭 (실측). */
const COLUMN_WIDTHS = [
  23, 17, 23, 29, 25, 35, 29, 17, 29, 29, 29, 41, 47, 23, 23, 35, 29, 53, 29, 23, 35, 51,
  35, 29, 29
];

type SheetCell = {
  ref: string;
  /** xs:style index — 1 = 헤더(굵은 노랑+테두리), 2 = 데이터(테두리+wrap). */
  s: 1 | 2;
  t?: "s" | "n";
  /** t="s" 면 shared string index, t="n" 이면 숫자 문자열. */
  v?: string;
};

export function reviewsToXlsx(reviews: RawReview[], ctx?: ReviewExportContext): Uint8Array {
  const strings: string[] = [];
  const ref = (s: string): number => {
    const i = strings.indexOf(s);
    if (i >= 0) return i;
    strings.push(s);
    return strings.length - 1;
  };

  const headerCells: SheetCell[] = SMARTSTORE_REVIEW_HEADERS.map((h, col) => ({
    ref: cellRef(col, 1),
    s: 1,
    t: "s",
    v: String(ref(h))
  }));

  const dataRows: SheetCell[][] = reviews.map((r, i) => {
    const row = i + 2;
    const values = reviewToOfficialRow(r, ctx);
    return values.map((v, col): SheetCell => {
      const refName = cellRef(col, row);
      if (v === "") return { ref: refName, s: 2 };
      if (OFFICIAL_NUMERIC_COLUMNS.has(col) && /^\d+(\.\d+)?$/.test(v)) {
        return { ref: refName, s: 2, t: "n", v: String(Number(v)) };
      }
      return { ref: refName, s: 2, t: "s", v: String(ref(v)) };
    });
  });

  // shared string 참조 총수(중복 포함) = 헤더 25 + 데이터 텍스트 셀 수
  const textRefs = dataRows.reduce((acc, cells) => acc + cells.filter((c) => c.t === "s").length, 0);
  const totalRefs = SMARTSTORE_REVIEW_HEADERS.length + textRefs;

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(ROOT_RELS),
    "docProps/core.xml": strToU8(corePropsXml()),
    "docProps/app.xml": strToU8(APP_PROPS),
    "xl/workbook.xml": strToU8(WORKBOOK),
    "xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS),
    "xl/styles.xml": strToU8(STYLES),
    "xl/sharedStrings.xml": strToU8(sharedStringsXml(strings, totalRefs)),
    "xl/worksheets/sheet1.xml": strToU8(buildSheetXml(headerCells, dataRows, reviews.length + 1))
  };
  return zipSync(files, { level: 6 });
}

function buildSheetXml(headerCells: SheetCell[], dataRows: SheetCell[][], totalRows: number): string {
  const cols = COLUMN_WIDTHS.map(
    (w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}.0" outlineLevel="0" customWidth="true" bestFit="false"/>`
  ).join("");
  const rows = [
    rowXml(1, headerCells),
    ...dataRows.map((cells, i) => rowXml(i + 2, cells, true))
  ].join("");
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    '<sheetPr filterMode="false"><pageSetUpPr fitToPage="false" autoPageBreaks="false"/></sheetPr>' +
    `<dimension ref="A1:${cellRef(24, totalRows)}"/>` +
    '<sheetViews><sheetView workbookViewId="0"></sheetView></sheetViews>' +
    '<sheetFormatPr defaultRowHeight="15.0"/>' +
    `<cols>${cols}</cols>` +
    `<sheetData>${rows}</sheetData>` +
    "</worksheet>"
  );
}

function rowXml(rowNum: number, cells: SheetCell[], tall = false): string {
  const attrs = tall ? ` r="${rowNum}" ht="50.0" customHeight="1"` : ` r="${rowNum}"`;
  return `<row${attrs}>${cells.map(cellXml).join("")}</row>`;
}

function cellXml(c: SheetCell): string {
  if (!c.t) return `<c r="${c.ref}" s="2"></c>`;
  if (c.t === "n") return `<c r="${c.ref}" s="${c.s}" t="n"><v>${c.v}</v></c>`;
  return `<c r="${c.ref}" s="${c.s}" t="s"><v>${c.v}</v></c>`;
}

function sharedStringsXml(strings: string[], totalRefs: number): string {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    `<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${totalRefs}" uniqueCount="${strings.length}">` +
    strings.map((s) => `<si><t>${escapeXml(s)}</t></si>`).join("") +
    "</sst>"
  );
}

function corePropsXml(): string {
  const created = new Date().toISOString();
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
    '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">' +
    "<dc:creator>MyApplication</dc:creator>" +
    `<dcterms:created xsi:type="dcterms:W3CDTF">${created}</dcterms:created>` +
    "</cp:coreProperties>"
  );
}

function cellRef(col: number, row: number): string {
  let s = "";
  let n = col;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s + row;
}

function escapeXml(s: string): string {
  return s
    // XML 1.0 불허 제어문자 제거(탭 \x09, 개행 \x0A, 캐리지리턴 \x0D 는 허용)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// 아래 OOXML 파트는 공식 파일의 실측 XML 과 동일한 형태.

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>' +
  '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>' +
  "</Types>";

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>' +
  '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>' +
  "</Relationships>";

const WORKBOOK =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<workbookPr date1904="false"/>' +
  '<bookViews><workbookView activeTab="0"/></bookViews>' +
  '<sheets><sheet name="Sheet0" r:id="rId3" sheetId="1"/></sheets>' +
  "<definedNames></definedNames>" +
  "</workbook>";

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="no"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Target="sharedStrings.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings"/>' +
  '<Relationship Id="rId2" Target="styles.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"/>' +
  '<Relationship Id="rId3" Target="worksheets/sheet1.xml" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"/>' +
  "</Relationships>";

const STYLES =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<numFmts count="0"></numFmts>' +
  '<fonts count="2">' +
  '<font><sz val="11.00"/><color rgb="FF000000"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11.00"/><color rgb="FF000000"/><name val="Calibri"/></font>' +
  "</fonts>" +
  '<fills count="3">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFFF99"/></patternFill></fill>' +
  "</fills>" +
  '<borders count="2">' +
  '<border><left/><right/><top/><bottom/><diagonal/></border>' +
  '<border><left style="thin"></left><right style="thin"></right><top style="thin"></top><bottom style="thin"></bottom><diagonal/></border>' +
  "</borders>" +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="3">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="true"/></xf>' +
  "</cellXfs>" +
  '<dxfs count="0"></dxfs>' +
  "</styleSheet>";

const APP_PROPS =
  '<?xml version="1.0" encoding="UTF-8"?>' +
  '<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">' +
  "<Application>MyApplication</Application>" +
  "<AppVersion>1.0</AppVersion>" +
  "</Properties>";