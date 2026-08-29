import { describe, expect, it } from "vitest";
import { clampToRemaining, kstDay, normalizeLocalUsage } from "../src/lib/usage";

describe("kstDay", () => {
  it("uses KST midnight as the day boundary", () => {
    // 2026-07-20 14:59 UTC = 2026-07-20 23:59 KST
    expect(kstDay(Date.UTC(2026, 6, 20, 14, 59))).toBe("2026-07-20");
    // 2026-07-20 15:00 UTC = 2026-07-21 00:00 KST
    expect(kstDay(Date.UTC(2026, 6, 20, 15, 0))).toBe("2026-07-21");
  });
});

describe("normalizeLocalUsage", () => {
  it("keeps today's count", () => {
    expect(normalizeLocalUsage({ day: "2026-07-21", count: 30 }, "2026-07-21")).toEqual({
      day: "2026-07-21",
      count: 30
    });
  });
  it("resets when the day changed", () => {
    expect(normalizeLocalUsage({ day: "2026-07-20", count: 50 }, "2026-07-21")).toEqual({
      day: "2026-07-21",
      count: 0
    });
  });
  it("resets on missing/invalid stored value", () => {
    expect(normalizeLocalUsage(undefined, "2026-07-21")).toEqual({ day: "2026-07-21", count: 0 });
    expect(normalizeLocalUsage({ day: "2026-07-21", count: "abc" }, "2026-07-21")).toEqual({
      day: "2026-07-21",
      count: 0
    });
  });
});

describe("clampToRemaining", () => {
  it("caps the request at the remaining quota", () => {
    expect(clampToRemaining(300, 50)).toBe(50);
    expect(clampToRemaining(30, 50)).toBe(30);
  });
  it("never goes negative", () => {
    expect(clampToRemaining(300, 0)).toBe(0);
    expect(clampToRemaining(300, -5)).toBe(0);
  });
  it("does not clamp when the limit is null (paid/unlimited)", () => {
    expect(clampToRemaining(2000, null)).toBe(2000);
    expect(clampToRemaining(10, null)).toBe(10);
  });
});
