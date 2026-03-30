"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { I18nProvider } from "@/lib/i18n";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { planLabel, type PlanTier } from "@/lib/plan";
import {
  primaryButtonClass,
  secondaryButtonClass
} from "@/components/marketing/MarketingPrimitives";

function TopBar({ planText, pathname }: { planText: string; pathname: string }) {
  const isMarketing = pathname === "/";
  const isDashboard = pathname.startsWith("/dashboard");
  const navItems = [
    { href: "/", label: "Overview" },
    { href: "/pricing", label: "Pricing" },
    { href: "/blog", label: "Insights" },
    { href: "/help", label: "Guide" }
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[rgba(8,10,14,0.76)] backdrop-blur-2xl">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between px-5 py-4 md:px-8">
        <a href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,rgba(110,196,255,0.28),rgba(91,108,255,0.12))] text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
            RB
          </span>
          <span className="flex flex-col">
            <span className="text-lg font-semibold tracking-[-0.04em] text-[var(--color-text)]">ReviewBoost</span>
            <span className="hidden text-[11px] uppercase tracking-[0.2em] text-white/44 md:block">Review intelligence workspace</span>
          </span>
        </a>

        <nav className="hidden items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.025] p-1 md:flex">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm transition ${
                pathname === item.href ? "bg-white/[0.08] text-[var(--color-text)]" : "text-[var(--color-muted)] hover:text-[var(--color-text)]"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <span className="hidden rounded-full border border-white/10 px-3 py-1 text-xs text-[var(--color-muted)] lg:inline-flex">{planText}</span>
          <a
            className={isDashboard ? secondaryButtonClass : isMarketing ? primaryButtonClass : secondaryButtonClass}
            href="/dashboard"
          >
            분석 워크스페이스
          </a>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-24 border-t border-white/[0.08]">
      <div className="mx-auto grid max-w-[1360px] gap-8 px-5 py-12 text-sm text-[var(--color-muted)] md:grid-cols-[1.2fr_0.8fr_0.8fr] md:px-8">
        <div>
          <div className="text-base font-semibold text-[var(--color-text)]">ReviewBoost</div>
          <p className="mt-3 max-w-sm leading-7">쿠팡과 스마트스토어 셀러가 리뷰 신호를 읽고, 우선순위를 정하고, 액션으로 연결하는 AI 운영 도구.</p>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-white/40">Built for seller teams that move weekly</p>
        </div>
        <div className="space-y-3">
          <a className="block hover:text-[var(--color-text)]" href="/pricing">Pricing</a>
          <a className="block hover:text-[var(--color-text)]" href="/blog">Insights</a>
          <a className="block hover:text-[var(--color-text)]" href="/help">Guide</a>
          <a className="block hover:text-[var(--color-text)]" href="/coupang-csv">Review CSV</a>
        </div>
        <div className="space-y-3">
          <a className="block hover:text-[var(--color-text)]" href="/privacy">Privacy</a>
          <a className="block hover:text-[var(--color-text)]" href="/term">Terms</a>
          <a className="block hover:text-[var(--color-text)]" href="mailto:support@reviewboost.co.kr">support@reviewboost.co.kr</a>
        </div>
      </div>
    </footer>
  );
}

export default function LayoutClient({
  children,
  initialPlan = "free",
  initialUserEmail = null
}: {
  children: React.ReactNode;
  initialPlan?: PlanTier;
  initialUserEmail?: string | null;
}) {
  const pathname = usePathname();
  const [plan, setPlan] = useState<PlanTier>(initialPlan);

  useEffect(() => {
    if (pathname.startsWith("/dashboard")) return;

    let active = true;

    fetch("/api/navigation-session", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { plan?: PlanTier; userEmail?: string | null } | null;
      })
      .then((session) => {
        if (!active || !session) return;
        setPlan(session.plan === "basic" || session.plan === "pro" ? session.plan : "free");
      })
      .catch(() => {
        void initialUserEmail;
      });

    return () => {
      active = false;
    };
  }, [initialUserEmail, pathname]);

  return (
    <I18nProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(88,132,255,0.16),transparent_28%),radial-gradient(circle_at_18%_18%,rgba(110,196,255,0.12),transparent_22%),linear-gradient(180deg,#071018,#090b0f_45%,#05070a)] text-[var(--color-text)]">
        <TopBar planText={planLabel(plan)} pathname={pathname} />
        <div className="w-full">{children}</div>
        <Footer />
      </div>
    </I18nProvider>
  );
}
