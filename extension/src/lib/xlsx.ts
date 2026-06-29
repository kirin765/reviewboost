import { strToU8, zipSync } from "fflate";
import type { RawReview } from "./types";

/**
 * 의존성 최소(SheetJS 미사용)로 만든 최소 OOXML .xlsx 생성기.
 * inlineStr 셀을 쓰므로 sharedStrings가 필요 없고, 텍스트는 수식이 아니라 안전하다.
 */

type Col = { header: string; get: (r: RawReview) => string | number | null; numeric?: boolean };

const COLUMNS: Col[] = [
  { header: "별점", get: (r) => r.rating, numeric: true },
  { header: "제목", get: (r) => r.title ?? "" },
  { header: "리뷰내용", get: (r) => r.text },
  { header: "작성자", get: (r) => r.author ?? "" },
  { header: "작성일", get: (r) => (r.reviewedAt ? r.reviewedAt.slice(0, 10) : "") },
  { header: "도움됨", get: (r) => r.helpfulCount ?? 0, numeric: true }
];

export function reviewsToXlsx(reviews: RawReview[]): Uint8Array {
  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(ROOT_RELS),
    "xl/workbook.xml": strToU8(WORKBOOK),
    "xl/_rels/workbook.xml.rels": strToU8(WORKBOOK_RELS),
    "xl/worksheets/sheet1.xml": strToU8(buildSheetXml(reviews))
  };
  return zipSync(files, { level: 6 });
}

function buildSheetXml(reviews: RawReview[]): string {
  const rows: string[] = [];
  rows.push(rowXml(1, COLUMNS.map((c, col) => textCell(col, 1, c.header))));
  reviews.forEach((r, i) => {
    const row = i + 2;
    const cells = COLUMNS.map((c, col) => {
      const v = c.get(r);
      if (c.numeric) {
        const n = typeof v === "number" ? v : Number(v);
        return Number.isFinite(n) ? numCell(col, row, n) : textCell(col, row, "");
      }
      return textCell(col, row, v == null ? "" : String(v));
    });
    rows.push(rowXml(row, cells));
  });
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    "<sheetData>" +
    rows.join("") +
    "</sheetData></worksheet>"
  );
}

function rowXml(rowNum: number, cells: string[]): string {
  return `<row r="${rowNum}">${cells.join("")}</row>`;
}

function textCell(col: number, row: number, value: string): string {
  return `<c r="${cellRef(col, row)}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function numCell(col: number, row: number, value: number): string {
  return `<c r="${cellRef(col, row)}"><v>${value}</v></c>`;
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

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  "</Types>";

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  "</Relationships>";

const WORKBOOK =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
  '<sheets><sheet name="리뷰" sheetId="1" r:id="rId1"/></sheets>' +
  "</workbook>";

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  "</Relationships>";
