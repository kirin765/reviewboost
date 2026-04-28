import { type CsvHeaderMode } from "@/lib/csv";

export function normalizeTimeBudget(raw: number | undefined): number {
  if (raw === undefined || !Number.isFinite(raw)) return Number.POSITIVE_INFINITY;
  if (raw <= 0) return 0;
  return Math.floor(raw);
}

export function normalizeHeaderMode(value: string | null | undefined): CsvHeaderMode {
  return value === "headerless" ? "headerless" : "header";
}

export function normalizeMaxCount(raw: number, fallback: number): number {
  if (!Number.isFinite(raw)) return fallback;
  const next = Math.floor(raw);
  if (next < 1) return fallback;
  return next;
}
