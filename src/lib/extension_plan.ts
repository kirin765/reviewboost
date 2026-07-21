import { hasActiveExtensionSubscription } from "@/lib/billing";

export type ExtensionTier = "free" | "paid";

export const EXTENSION_FREE_DAILY_LIMIT = 50;
export const EXTENSION_PAID_DAILY_LIMIT = 2000;

export function extensionDailyLimit(tier: ExtensionTier): number {
  return tier === "paid" ? EXTENSION_PAID_DAILY_LIMIT : EXTENSION_FREE_DAILY_LIMIT;
}

export async function resolveExtensionTier(userId: string): Promise<ExtensionTier> {
  return (await hasActiveExtensionSubscription(userId)) ? "paid" : "free";
}

/** 일일 쿼터의 하루 경계는 KST 자정. */
export function kstDayString(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
