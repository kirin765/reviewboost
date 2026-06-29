import { describe, expect, it } from "vitest";
import { reviewsToCsv } from "../src/lib/csv";

describe("reviewsToCsv", () => {
  it("emits BOM + ReviewBoost auto-detect headers", () => {
    const csv = reviewsToCsv([{ text: "좋아요", rating: 5, reviewedAt: "2026-01-15T00:00:00.000Z" }]);
    expect(csv.startsWith("﻿리뷰내용,별점,작성일\r\n")).toBe(true);
    expect(csv).toContain("좋아요,5,2026-01-15");
  });

  it("neutralizes CSV formula injection", () => {
    const csv = reviewsToCsv([{ text: "=SUM(A1)", rating: null, reviewedAt: null }]);
    expect(csv).toContain("'=SUM(A1)");
  });

  it("quotes fields with commas/quotes and flattens newlines", () => {
    const csv = reviewsToCsv([{ text: 'a,b"c', rating: 4, reviewedAt: null }]);
    expect(csv).toContain('"a,b""c"');
    const csv2 = reviewsToCsv([{ text: "line1\nline2", rating: 4, reviewedAt: null }]);
    expect(csv2).toContain("line1 line2");
  });
});
