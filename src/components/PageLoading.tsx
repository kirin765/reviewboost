import React from "react";
import { ShellContainer } from "@/components/ui/Primitives";

type PageLoadingProps = {
  title: string;
  description: string;
  hint?: string;
};

export default function PageLoading({ title, description, hint }: PageLoadingProps) {
  return (
    <main className="pageMain py-12" aria-busy="true" aria-live="polite">
      <ShellContainer className="max-w-[920px]">
        <div className="mb-6">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">페이지 로딩</p>
          <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.8rem)] font-semibold tracking-[-0.05em] text-[var(--rb-fg)]">{title}</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">{description}</p>
          {hint ? <p className="mt-2 text-sm leading-7 text-[var(--rb-muted)]">{hint}</p> : null}
        </div>

        <section className="rounded-[24px] border border-[color:var(--rb-border)] bg-white p-6 shadow-[0_10px_30px_rgba(31,37,64,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--rb-accent)] opacity-50" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--rb-accent)]" />
              </span>
              <div>
                <p className="text-sm font-medium text-[var(--rb-fg)]">화면을 준비하고 있어요</p>
                <p className="text-xs text-[var(--rb-muted)]">준비가 끝나면 바로 이어서 볼 수 있습니다.</p>
              </div>
            </div>
            <span className="rounded-full border border-[color:rgba(91,92,234,0.18)] bg-[rgba(91,92,234,0.08)] px-3 py-1 text-[11px] text-[var(--rb-accent)]">
              잠시만 기다려주세요
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[18px] border border-[color:#e6e8f2] bg-white p-4">
              <div className="h-3 w-20 animate-pulse rounded-full bg-[rgba(255,255,255,0.12)]" />
              <div className="mt-4 h-9 w-28 animate-pulse rounded-full bg-[#eef0f8]" />
              <div className="mt-3 h-3 w-24 animate-pulse rounded-full bg-[#eef0f8]" />
            </div>
            <div className="rounded-[18px] border border-[color:#e6e8f2] bg-white p-4 md:col-span-2">
              <div className="h-3 w-28 animate-pulse rounded-full bg-[rgba(255,255,255,0.12)]" />
              <div className="mt-4 h-28 animate-pulse rounded-[16px] bg-white" />
            </div>
          </div>

          <div className="mt-4 rounded-[18px] border border-[color:#e6e8f2] bg-white p-4">
            <div className="h-3 w-24 animate-pulse rounded-full bg-[rgba(255,255,255,0.12)]" />
            <div className="mt-4 space-y-3">
              <div className="h-12 animate-pulse rounded-[14px] bg-white" />
              <div className="h-12 animate-pulse rounded-[14px] bg-white" />
              <div className="h-12 animate-pulse rounded-[14px] bg-white" />
            </div>
          </div>
        </section>
      </ShellContainer>
    </main>
  );
}
