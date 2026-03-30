"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { ShellContainer, Surface } from "@/components/ui/Primitives";
import { useTranslation } from "@/lib/i18n";

interface AuthShellProps {
  eyebrow: string;
  title: string;
  lead: string;
  bullets: string[];
  note?: string;
  children: ReactNode;
  asideFooter?: ReactNode;
}

export default function AuthShell({ eyebrow, title, lead, bullets, note, children, asideFooter }: AuthShellProps) {
  const { locale } = useTranslation();
  const visualMain = locale === "en" ? "From review upload to actionable fixes." : "리뷰 업로드부터 실행 가능한 수정 포인트까지.";
  const visualSide = locale === "en" ? "Recent weight is driving urgency" : "최근성 비중이 긴급도를 올리고 있습니다";

  return (
    <main className="pageMain authPage pb-10 pt-8 md:pt-12">
      <ShellContainer>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <Surface className="overflow-hidden px-6 py-7 md:px-8 md:py-8">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[var(--rb-accent)] text-[#071112]">
                <svg viewBox="0 0 20 20" className="h-5 w-5">
                  <path d="M4 12.4 8.2 9.6l3.4 1.7 4.4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="4.1" cy="12.5" r="1.2" fill="currentColor" />
                  <circle cx="8.2" cy="9.6" r="1.2" fill="currentColor" />
                  <circle cx="16" cy="7.3" r="1.2" fill="currentColor" />
                </svg>
              </span>
              <div>
                <strong className="block text-sm font-semibold tracking-[-0.02em] text-[var(--rb-fg)]">ReviewBoost</strong>
                <span className="block text-[11px] text-[var(--rb-muted)]">Analytical seller workspace</span>
              </div>
            </Link>

            <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">{eyebrow}</p>
            <h1 className="mt-4 text-[clamp(2.2rem,4vw,4rem)] font-semibold leading-[1.02] tracking-[-0.06em] text-[var(--rb-fg)]">{title}</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--rb-muted-strong)]">{lead}</p>

            <div className="mt-8 rounded-[18px] border border-[color:rgba(255,255,255,0.06)] bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-5">
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_180px]">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Workspace preview</p>
                  <h2 className="mt-3 text-xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{visualMain}</h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{visualSide}</p>
                </div>
                <div className="grid gap-3">
                  <div className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="text-xs text-[var(--rb-muted)]">Negative rate</p>
                    <strong className="mt-2 block text-2xl font-semibold tracking-[-0.04em]">33%</strong>
                  </div>
                  <div className="rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
                    <p className="text-xs text-[var(--rb-muted)]">Priority</p>
                    <strong className="mt-2 block text-2xl font-semibold tracking-[-0.04em]">46.7</strong>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 grid gap-3">
              {bullets.map((bullet) => (
                <div key={bullet} className="flex items-start gap-3 text-sm leading-7 text-[var(--rb-muted-strong)]">
                  <span className="mt-2 h-2 w-2 rounded-full bg-[var(--rb-accent)]" aria-hidden="true" />
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            {note ? <div className="mt-8 rounded-[14px] border border-[color:rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-4 py-4 text-sm leading-7 text-[var(--rb-muted-strong)]">{note}</div> : null}
            {asideFooter ? <div className="mt-6">{asideFooter}</div> : null}
          </Surface>

          <Surface className="px-6 py-7 md:px-8 md:py-8">
            {children}
          </Surface>
        </div>
      </ShellContainer>
    </main>
  );
}
