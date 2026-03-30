"use client";

import type { ReactNode } from "react";
import { useTranslation } from "@/lib/i18n";
import { Eyebrow, Panel, pageShellClass } from "@/components/marketing/MarketingPrimitives";

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
  const visualMain = locale === "en" ? "Upload CSV, map columns, and share results in one workflow." : "CSV 업로드, 매핑, 결과 공유를 한 흐름으로 정리합니다.";
  const visualSide = locale === "en" ? "Recent negative review response speed improved" : "최근 부정 리뷰 대응 속도 개선";

  return (
    <main className={`${pageShellClass} pt-10`}>
      <div className="grid gap-6 lg:grid-cols-[1.04fr_0.96fr]">
        <Panel className="relative overflow-hidden p-8 md:p-10" aria-label="Service intro">
          <div className="pointer-events-none absolute -left-10 top-8 h-36 w-36 rounded-full bg-[radial-gradient(circle,rgba(143,212,255,0.22),transparent_72%)] blur-xl" />
          <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-[radial-gradient(circle,rgba(108,129,255,0.18),transparent_70%)] blur-xl" />

          <a className="inline-flex items-center gap-3" href="/">
            <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[linear-gradient(135deg,rgba(143,212,255,0.24),rgba(108,129,255,0.16))] text-sm font-semibold text-white">
              RB
            </span>
            <span className="flex flex-col">
              <strong className="text-lg tracking-[-0.04em] text-white">ReviewBoost</strong>
              <small className="text-[11px] uppercase tracking-[0.18em] text-white/42">AI review ops dashboard</small>
            </span>
          </a>

          <Eyebrow className="mt-10">{eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-[620px] text-5xl font-semibold tracking-[-0.07em] text-white md:text-6xl md:leading-[0.96]">{title}</h1>
          <p className="mt-6 max-w-[560px] text-base leading-8 text-[var(--color-muted)]">{lead}</p>

          <div className="mt-10 grid gap-4 md:grid-cols-[1.1fr_0.9fr]" aria-hidden="true">
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.04] p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Workspace</div>
              <strong className="mt-4 block text-2xl font-medium tracking-[-0.05em] text-white">Review analysis</strong>
              <span className="mt-3 block text-sm leading-7 text-white/70">{visualMain}</span>
            </div>
            <div className="rounded-[28px] border border-white/[0.08] bg-white/[0.03] p-5">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/42">Weekly signal</div>
              <strong className="mt-4 block text-4xl font-semibold tracking-[-0.06em] text-white">+24%</strong>
              <span className="mt-3 block text-sm leading-7 text-white/70">{visualSide}</span>
            </div>
          </div>

          <div className="mt-10 space-y-3">
            {bullets.map((bullet) => (
              <div className="flex items-start gap-3 text-sm text-white/78" key={bullet}>
                <span className="mt-2 h-2 w-2 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
                <span>{bullet}</span>
              </div>
            ))}
          </div>

          {note ? <div className="mt-8 rounded-[20px] border border-white/[0.08] bg-white/[0.03] px-4 py-4 text-sm leading-7 text-[var(--color-muted)]">{note}</div> : null}
          {asideFooter ? <div className="mt-6">{asideFooter}</div> : null}
        </Panel>

        <Panel className="authPanel p-6 md:p-8">
          {children}
        </Panel>
      </div>
    </main>
  );
}
