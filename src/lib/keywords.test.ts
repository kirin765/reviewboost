import { describe, expect, it } from "vitest";
import { extractPositiveKeywords, topKeywords } from "./keywords";

describe("topKeywords", () => {
  it("counts token frequency and returns the most frequent first", () => {
    // "마감" is a 품질 synonym, so all four occurrences collapse onto "품질".
    const result = topKeywords(["마감 마감 마감", "마감 처리"], 5);
    const top = result[0];
    expect(top?.keyword).toBe("품질");
    expect(top?.count).toBe(4);
  });

  it("maps synonyms to a canonical keyword", () => {
    // "늦게", "지연", "늦어요" all collapse to "배송지연".
    const result = topKeywords(["배송이 늦게 왔어요", "도착이 지연됐어요", "너무 늦어요"], 5);
    const delay = result.find((r) => r.keyword === "배송지연");
    expect(delay?.count).toBe(3);
  });

  it("drops stopwords, short tokens, and numeric fragments", () => {
    const result = topKeywords(["정말 너무 12 2025년"], 10);
    // 정말/너무 are stopwords, single chars are removed, digits excluded.
    expect(result).toEqual([]);
  });

  it("does not map 새것/새벽 to 냄새 or 문제없었 to 구성품누락", () => {
    const result = topKeywords(["새것 같아요", "새벽에 도착", "문제 없었어요"], 10);
    const keywords = result.map((r) => r.keyword);
    expect(keywords).not.toContain("냄새");
    expect(keywords).not.toContain("구성품누락");
  });

  it("still maps real smell/missing-part complaints", () => {
    const result = topKeywords(["냄새나요 심해요", "부품 누락 됐어요"], 10);
    const keywords = result.map((r) => r.keyword);
    expect(keywords).toContain("냄새");
    expect(keywords).toContain("구성품누락");
  });

  it("respects the topN limit", () => {
    const result = topKeywords(["가나 다라 마바 사아 자차"], 2);
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it("surfaces frequent bigrams (count >= 3)", () => {
    const line = "화면 마감 불량";
    const result = topKeywords([line, line, line], 20);
    expect(result.some((r) => r.keyword.includes(" "))).toBe(true);
  });
});

describe("extractPositiveKeywords", () => {
  it("extracts positive indicators and ranks by frequency", () => {
    const result = extractPositiveKeywords(["가성비 최고예요", "가성비 좋아요", "품질도 좋아요"], 10);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]?.count).toBeGreaterThanOrEqual(result[result.length - 1]?.count ?? 0);
  });

  it("returns nothing when no positive indicator is present", () => {
    expect(extractPositiveKeywords(["배송이 늦고 불량이 왔어요"], 10)).toEqual([]);
  });
});
