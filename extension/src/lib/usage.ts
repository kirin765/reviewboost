import { AUTH_STORAGE_KEY, FREE_DAILY_LIMIT, RB_USAGE_ENDPOINT, USAGE_STORAGE_KEY } from "./config";

export type AuthState = { token: string; expiresAt: number };

export type UsageState = {
  authenticated: boolean;
  tier: "anonymous" | "free" | "paid";
  limit: number;
  used: number;
  remaining: number;
};

export type LocalUsage = { day: string; count: number };

/** 일일 한도의 하루 경계는 KST 자정 (서버와 동일 기준). */
export function kstDay(nowMs = Date.now()): string {
  return new Date(nowMs + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** 저장된 로컬 사용량을 오늘 기준으로 정규화한다 (날짜가 바뀌면 0으로 리셋). */
export function normalizeLocalUsage(raw: unknown, day: string): LocalUsage {
  const r = (raw ?? {}) as Partial<LocalUsage>;
  const count = Number(r.count);
  if (r.day === day && Number.isFinite(count) && count > 0) {
    return { day, count: Math.floor(count) };
  }
  return { day, count: 0 };
}

/** 요청 수집 개수를 남은 한도로 자른다. */
export function clampToRemaining(requested: number, remaining: number): number {
  return Math.max(0, Math.min(requested, remaining));
}

async function getAuth(): Promise<AuthState | null> {
  const data = await chrome.storage.local.get(AUTH_STORAGE_KEY);
  const auth = (data as Record<string, unknown>)[AUTH_STORAGE_KEY] as AuthState | undefined;
  if (!auth?.token || typeof auth.expiresAt !== "number" || auth.expiresAt < Date.now()) return null;
  return auth;
}

export async function isConnected(): Promise<boolean> {
  return (await getAuth()) !== null;
}

async function getLocalUsage(): Promise<LocalUsage> {
  const data = await chrome.storage.local.get(USAGE_STORAGE_KEY);
  return normalizeLocalUsage((data as Record<string, unknown>)[USAGE_STORAGE_KEY], kstDay());
}

async function setLocalUsage(usage: LocalUsage): Promise<void> {
  await chrome.storage.local.set({ [USAGE_STORAGE_KEY]: usage });
}

function localUsageState(local: LocalUsage): UsageState {
  return {
    authenticated: false,
    tier: "anonymous",
    limit: FREE_DAILY_LIMIT,
    used: local.count,
    remaining: Math.max(0, FREE_DAILY_LIMIT - local.count)
  };
}

/**
 * 현재 사용량/한도. 계정 연결 시 서버 기준, 아니면(또는 서버 불통 시) 로컬 카운트.
 */
export async function loadUsage(): Promise<UsageState> {
  const auth = await getAuth();
  if (auth) {
    try {
      const res = await fetch(RB_USAGE_ENDPOINT, {
        headers: { authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        const data = (await res.json()) as {
          authenticated?: boolean;
          tier?: string;
          limit?: number;
          used?: number | null;
          remaining?: number | null;
        };
        if (data.authenticated && typeof data.limit === "number") {
          return {
            authenticated: true,
            tier: data.tier === "paid" ? "paid" : "free",
            limit: data.limit,
            used: data.used ?? 0,
            remaining: data.remaining ?? data.limit
          };
        }
      }
    } catch {
      // 서버 불통 → 로컬 카운트로 폴백
    }
  }
  return localUsageState(await getLocalUsage());
}

/**
 * 수집 완료 후 사용량 기록. 연결된 계정이면 서버에 소비를 보고하고,
 * 항상 로컬 카운트도 함께 올린다 (폴백 수치 일관성).
 */
export async function recordCollected(count: number): Promise<void> {
  if (count <= 0) return;

  const local = await getLocalUsage();
  await setLocalUsage({ day: local.day, count: local.count + count });

  const auth = await getAuth();
  if (!auth) return;
  try {
    await fetch(RB_USAGE_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${auth.token}` },
      body: JSON.stringify({ count })
    });
  } catch {
    // 보고 실패는 치명적이지 않다 — 다음 loadUsage 때 서버 수치로 수렴.
  }
}
