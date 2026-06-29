import type { RawReview } from "./types";

// ReviewBoost csv.ts 가 자동 인식하는 한글 헤더 → 업로드 시 매핑 UI 없이 바로 분석됨.
const CSV_HEADERS = ["리뷰내용", "별점", "작성일"];

/** CSV 수식 인젝션 방지 + 따옴표/개행 이스케이프(crawler-server/src/csv.js 포팅). */
function escapeCell(value: unknown): string {
  let str = String(value ?? "").replace(/\r\n/g, " ").replace(/[\r\n]/g, " ");
  if (/^[=+\-@\t]/.test(str)) str = `'${str}`;
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function dateOnly(iso: string | null | undefined): string {
  return iso ? iso.slice(0, 10) : "";
}

/** 사용자 다운로드용 CSV(UTF-8 BOM). 본문/별점/작성일 3열. */
export function reviewsToCsv(reviews: RawReview[]): string {
  const header = CSV_HEADERS.join(",");
  const rows = reviews.map((r) =>
    [r.text, r.rating ?? "", dateOnly(r.reviewedAt)].map(escapeCell).join(",")
  );
  return "﻿" + [header, ...rows].join("\r\n");
}
