"use client";

import React, { type ReactNode } from "react";
import Link from "next/link";
import { ShellContainer, Surface } from "@/components/ui/Primitives";

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
  return (
    <main className="pageMain authPage pb-10 pt-8 md:pt-12">
      <ShellContainer>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,0.92fr)_minmax(420px,0.78fr)] lg:items-start">
          <div className="px-2 py-2 md:px-4">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[var(--rb-accent)] text-[#ffffff]">
                <svg viewBox="0 0 20 20" className="h-5 w-5">
                  <path d="M4 12.4 8.2 9.6l3.4 1.7 4.4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="4.1" cy="12.5" r="1.2" fill="currentColor" />
                  <circle cx="8.2" cy="9.6" r="1.2" fill="currentColor" />
                  <circle cx="16" cy="7.3" r="1.2" fill="currentColor" />
                </svg>
              </span>
              <div>
                <strong className="block text-sm font-semibold tracking-[-0.02em] text-[var(--rb-fg)]">ReviewBoost</strong>
                <span className="block text-[11px] text-[var(--rb-muted)]">셀러를 위한 리뷰 분석 워크스페이스</span>
              </div>
            </Link>

            <p className="mt-8 text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">{eyebrow}</p>
            <h1 className="mt-4 max-w-2xl text-[clamp(2.4rem,5vw,4.6rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-[var(--rb-fg)]">{title}</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-[var(--rb-muted-strong)]">{lead}</p>

            <div className="mt-10 grid gap-4 border-t border-[color:rgba(31,37,89,0.08)] pt-6">
              {bullets.map((bullet) => (
                <div key={bullet} className="grid gap-3 border-b border-[color:rgba(31,37,89,0.08)] pb-4 text-sm leading-7 text-[var(--rb-muted-strong)] last:border-b-0">
                  <div className="inline-flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[var(--rb-accent)]" aria-hidden="true" />
                    <span>{bullet}</span>
                  </div>
                </div>
              ))}
            </div>

            {note ? <p className="mt-8 max-w-xl text-sm leading-7 text-[var(--rb-muted)]">{note}</p> : null}
            {asideFooter ? <div className="mt-6">{asideFooter}</div> : null}
          </div>

          <Surface className="px-6 py-7 md:px-8 md:py-8">
            {children}
          </Surface>
        </div>
      </ShellContainer>
    </main>
  );
}
