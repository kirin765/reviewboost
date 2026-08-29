import { hasExtensionPaidAccess } from "@/lib/billing";

export type ExtensionTier = "free" | "paid";

export const EXTENSION_FREE_DAILY_LIMIT = 50;

/**
 * 유료 플랜은 일일 한도 없음(무제한). null = unlimited.
 * (익스텐션의 1회 수집 안전 상한 COLLECT_HARD_MAX=2000 은 유지 — 일일 한도와 별개)
 */
export function extensionDailyLimit(tier: ExtensionTier): number | null {
  return tier === "paid" ? null : EXTENSION_FREE_DAILY_LIMIT;
}

export async function resolveExtensionTier(userId: string): Promise<ExtensionTier> {
  return (await hasExtensionPaidAccess(userId)) ? "paid" : "free";
}

/** 일일 쿼터의 하루 경계는 KST 자정. */
export function kstDayString(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
