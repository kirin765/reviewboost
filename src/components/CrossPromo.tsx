"use client";

import { useEffect, useState } from "react";

const SAJANGBU_URL = "https://sajangbu.com/?utm_source=reviewboost&utm_medium=cross&utm_campaign=cross_promo";
const DISMISS_KEY = "rb_cross_promo_sajangbu_dismissed";

/** Dismissible cross-promo for sajangbu (쿠팡 정산 자동화) — same ICP as ReviewBoost. */
export default function CrossPromo({ className = "" }: { className?: string }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    try {
      setHidden(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setHidden(false);
    }
  }, []);

  if (hidden) return null;

  return (
    <div
      className={`relative flex flex-col gap-4 rounded-[20px] border border-[color:var(--rb-border)] bg-[var(--rb-surface)] p-5 shadow-[0_16px_36px_rgba(34,46,121,0.08)] sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <button
        type="button"
        aria-label="닫기"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // ignore
          }
          setHidden(true);
        }}
        className="absolute right-3 top-3 text-[var(--rb-muted)] hover:text-[var(--rb-fg)]"
      >
        ✕
      </button>

      <div className="flex items-start gap-3 pr-6">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[rgba(91,92,234,0.12)] text-lg font-semibold text-[var(--rb-accent)]" aria-hidden="true">
          ₩
        </span>
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[var(--rb-muted)]">함께 쓰면 좋아요</p>
          <p className="mt-1 text-base font-semibold tracking-[-0.02em] text-[var(--rb-fg)]">쿠팡 정산도 자동으로 — 사장부</p>
          <p className="mt-1 text-sm leading-6 text-[var(--rb-muted-strong)]">
            정산 예정일·수수료·실지급액을 자동 계산해 정산 누락을 막아줍니다.
          </p>
        </div>
      </div>

      <a
        href={SAJANGBU_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btnPrimary btnSmall shrink-0 self-start sm:self-center"
      >
        사장부 보러가기
      </a>
    </div>
  );
}
