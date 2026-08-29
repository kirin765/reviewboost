import {
  reviewToOfficialRow,
  SMARTSTORE_REVIEW_HEADERS,
  type ReviewExportContext
} from "./excel-form";
import type { RawReview } from "./types";

// 스마트스토어 판매자센터 공식 리뷰 내보내기와 같은 25열 폼을 그대로 쓴다.
// ReviewBoost csv.ts 는 리뷰상세내용/구매자평점/리뷰등록일 헤더를 자동 인식하므로
// 업로드 시 매핑 UI 없이 바로 분석된다 (나머지 열은 분석에 안 쓰이지만 원본을 보존).

/** CSV 수식 인젝션 방지 + 따옴표/개행 이스케이프(crawler-server/src/csv.js 포팅). */
function escapeCell(value: unknown): string {
  let str = String(value ?? "").replace(/\r\n/g, " ").replace(/[\r\n]/g, " ");
  if (/^[=+\-@\t]/.test(str)) str = `'${str}`;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** 사용자 다운로드용 CSV(UTF-8 BOM, 스마트스토어 공식 리뷰 25열 폼). */
export function reviewsToCsv(reviews: RawReview[], ctx?: ReviewExportContext): string {
  const header = SMARTSTORE_REVIEW_HEADERS.join(",");
  const rows = reviews.map((r) => reviewToOfficialRow(r, ctx).map(escapeCell).join(","));
  return "﻿" + [header, ...rows].join("\r\n");
}
