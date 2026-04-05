"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import type { PlanTier } from "@/types/user";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  plan?: PlanTier;
};

const planColors: Record<PlanTier, string> = {
  free: "border-white/[0.08] text-white/50",
  basic: "border-[#4f7fff]/40 text-[#7ba8ff] bg-[#4f7fff]/[0.08]",
  pro: "border-amber-300/40 text-amber-300 bg-amber-300/[0.08]"
};

export default function DashboardShell({ children, userEmail = null, plan = "free" }: DashboardShellProps) {
  const pathname = usePathname();

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "분석 홈", active: pathname === "/dashboard" || pathname.startsWith("/dashboard/history") || pathname.startsWith("/dashboard/analysis/") },
      { href: "/dashboard/analyze", label: "분석하기", active: pathname.startsWith("/dashboard/analyze") },
      { href: "/coupang-csv", label: "리뷰 가져오기", active: pathname.startsWith("/coupang-csv") }
    ],
    [pathname]
  );

  return (
    <section className="min-h-screen bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgba(79,127,255,0.1),transparent),linear-gradient(180deg,#070a10,#080c14_60%,#06090f)] text-[var(--color-text)]">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[rgba(7,10,16,0.88)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-3.5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-wrap items-center gap-4">
            {/* Logo */}
            <a href="/" className="flex items-center gap-3 group">
              <span className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-[linear-gradient(135deg,rgba(79,127,255,0.3),rgba(99,102,241,0.2))] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] text-xs font-bold text-white transition group-hover:shadow-[0_0_16px_rgba(79,127,255,0.3)]">
                RB
              </span>
              <span>
                <span className="block text-[15px] font-semibold tracking-[-0.04em] text-white">ReviewBoost</span>
                <span className="block text-[10px] uppercase tracking-[0.2em] text-white/30">Workspace</span>
              </span>
            </a>

            {/* Divider */}
            <span className="hidden h-5 w-px bg-white/10 md:block" />

            {/* Nav */}
            <nav className="flex flex-wrap items-center gap-1">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`relative rounded-[12px] px-3.5 py-2 text-sm transition-all duration-200 ${
                    item.active
                      ? "bg-white/[0.08] text-white font-medium"
                      : "text-[var(--color-muted)] hover:bg-white/[0.04] hover:text-white/80"
                  }`}
                >
                  {item.active && (
                    <span className="absolute left-1/2 -translate-x-1/2 -bottom-[1px] h-[2px] w-4 rounded-full bg-[var(--color-primary)]" />
                  )}
                  {item.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="hidden text-[var(--color-muted)] md:inline text-xs">{userEmail ?? "guest"}</span>
            <span className={`rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] transition ${planColors[plan]}`}>
              {plan}
            </span>
            <a
              href="/pricing"
              className="inline-flex items-center justify-center rounded-[12px] bg-[linear-gradient(135deg,#4f7fff,#6366f1)] px-4 py-2 text-xs font-semibold text-white shadow-[0_0_0_0_rgba(79,127,255,0)] transition-all duration-300 hover:shadow-[0_4px_16px_rgba(79,127,255,0.4)] hover:translate-y-[-1px]"
            >
              플랜 보기
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1240px] px-5 pb-16 pt-8 md:px-8">{children}</main>
    </section>
  );
}
