"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { PlanTier } from "@/types/user";
import { primaryButtonClass } from "@/components/marketing/MarketingPrimitives";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  plan?: PlanTier;
};

export default function DashboardShell({ children, userEmail = null, plan = "free" }: DashboardShellProps) {
  const pathname = usePathname();

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "분석 홈", active: pathname === "/dashboard" || pathname.startsWith("/dashboard/history") || pathname.startsWith("/dashboard/analysis/") },
      { href: "/dashboard/analyze", label: "분석하기", active: pathname.startsWith("/dashboard/analyze") },
      { href: "/coupang-csv", label: "상품리뷰 가져오기", active: pathname.startsWith("/coupang-csv") }
    ],
    [pathname]
  );

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(88,132,255,0.12),transparent_24%),linear-gradient(180deg,#06080b,#090d12_55%,#05070a)] text-[var(--color-text)]">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[rgba(8,10,14,0.82)] backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-wrap items-center gap-5">
            <a href="/" className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[13px] bg-[linear-gradient(135deg,rgba(143,212,255,0.24),rgba(108,129,255,0.14))] text-sm font-semibold text-white">
                RB
              </span>
              <span>
                <span className="block text-lg font-semibold tracking-[-0.04em] text-white">ReviewBoost</span>
                <span className="block text-[11px] uppercase tracking-[0.18em] text-white/38">Workspace</span>
              </span>
            </a>
            <nav className="flex flex-wrap items-center gap-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`rounded-[14px] px-4 py-2 text-sm transition ${
                    item.active ? "bg-white/[0.09] text-white" : "text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted)]">
            <span className="hidden md:inline">{userEmail ?? "guest"}</span>
            <span className="rounded-full border border-white/[0.08] px-3 py-1">{plan.toUpperCase()}</span>
            <a href="/pricing" className={`${primaryButtonClass} px-4 py-2.5 text-xs md:text-sm`}>
              플랜 보기
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 pb-16 pt-8 md:px-8">{children}</main>
    </section>
  );
}
