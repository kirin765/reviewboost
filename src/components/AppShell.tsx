"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/navigation/SidebarNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer } from "@/components/ui/Primitives";
import type { PlanTier } from "@/types/user";

type AppShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  plan?: PlanTier;
};

type ChromeConfig = {
  label?: string;
  title: string;
  description?: string;
  actionHref?: string;
  actionLabel?: string;
  showHeader: boolean;
  showFooter: boolean;
  isWorkspace: boolean;
};

function getChromeConfig(pathname: string): ChromeConfig {
  if (pathname.startsWith("/dashboard/analysis/")) {
    return {
      label: "Saved report",
      title: "저장된 분석",
      description: "저장한 리포트를 다시 열어 요약과 PDF를 확인합니다.",
      actionHref: "/dashboard",
      actionLabel: "홈",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname.startsWith("/dashboard/history")) {
    return {
      label: "Dashboard home",
      title: "홈",
      description: "지금까지 분석한 리뷰 통계와 이전 결과를 확인합니다.",
      actionHref: "/dashboard/analyze",
      actionLabel: "AI분석",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname === "/dashboard") {
    return {
      label: "Workspace",
      title: "홈",
      description: "총 리뷰, 부정 비율, 평균 별점, 최근 30일 비중과 저장된 결과 목록을 봅니다.",
      actionHref: "/dashboard/analyze",
      actionLabel: "AI분석",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname.startsWith("/dashboard/analyze")) {
    return {
      label: "Analysis flow",
      title: "AI분석",
      description: "업로드, 열 확인, 분석 진행, 결과 확인을 같은 흐름으로 진행합니다.",
      actionHref: "/dashboard",
      actionLabel: "홈",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname.startsWith("/coupang-csv")) {
    return {
      label: "Review download",
      title: "리뷰 다운",
      description: "상품 URL에서 리뷰 CSV를 내려받고 같은 흐름으로 분석까지 이어갈 수 있습니다.",
      actionHref: "/dashboard/analyze",
      actionLabel: "AI분석",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  return {
    title: "ReviewBoost",
    showHeader: true,
    showFooter: !pathname.startsWith("/dashboard"),
    isWorkspace: false
  };
}

function MarketingHeader({ userEmail }: { userEmail: string | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-[color:rgba(255,255,255,0.06)] bg-[rgba(7,11,12,0.84)] backdrop-blur-xl">
      <ShellContainer className="flex h-18 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
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
              <span className="block text-[11px] text-[var(--rb-muted)]">AI review analysis for sellers</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[var(--rb-muted-strong)] lg:flex">
            <Link href="/pricing" className="hover:text-[var(--rb-fg)]">Pricing</Link>
            <Link href="/coupang-csv" className="hover:text-[var(--rb-fg)]">CSV</Link>
            <Link href="/help" className="hover:text-[var(--rb-fg)]">Help</Link>
            <Link href="/blog" className="hover:text-[var(--rb-fg)]">Blog</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {userEmail ? (
            <Link href="/dashboard" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className={buttonStyles({ variant: "ghost", size: "sm" })}>
              로그인
            </Link>
          )}
          <Link href="/dashboard/analyze" className={buttonStyles({ variant: "primary", size: "sm" })}>
            리뷰 분석
          </Link>
        </div>
      </ShellContainer>
    </header>
  );
}

function MarketingFooter() {
  return (
    <footer className="border-t border-[color:rgba(255,255,255,0.06)] py-12">
      <ShellContainer className="grid gap-8 text-sm text-[var(--rb-muted-strong)] md:grid-cols-3">
        <div>
          <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">ReviewBoost</h2>
          <p className="mt-3 max-w-xs leading-7">쿠팡과 스마트스토어 셀러를 위한 AI 리뷰 분석 작업면.</p>
        </div>
        <div className="space-y-3">
          <Link href="/dashboard/analyze" className="block hover:text-[var(--rb-fg)]">분석하기</Link>
          <Link href="/pricing" className="block hover:text-[var(--rb-fg)]">요금제</Link>
          <Link href="/help" className="block hover:text-[var(--rb-fg)]">사용법</Link>
        </div>
        <div className="space-y-3">
          <Link href="/term" className="block hover:text-[var(--rb-fg)]">서비스 이용약관</Link>
          <Link href="/privacy" className="block hover:text-[var(--rb-fg)]">개인정보 처리방침</Link>
          <a href="mailto:support@reviewboost.co.kr" className="block hover:text-[var(--rb-fg)]">support@reviewboost.co.kr</a>
        </div>
      </ShellContainer>
    </footer>
  );
}

export default function AppShell({ children, userEmail = null, plan = "free" }: AppShellProps) {
  const pathname = usePathname();
  const config = useMemo(() => getChromeConfig(pathname), [pathname]);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const drawerFirstLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const updateDeviceMode = () => {
      const nextIsMobile = window.innerWidth < 1100;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) setOpen(false);
    };

    updateDeviceMode();
    window.addEventListener("resize", updateDeviceMode);
    return () => window.removeEventListener("resize", updateDeviceMode);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("appChromeNavOpen", isMobile && open);
    return () => document.body.classList.remove("appChromeNavOpen");
  }, [isMobile, open]);

  if (!config.isWorkspace) {
    return (
      <div className="min-h-screen bg-[var(--rb-bg)] text-[var(--rb-fg)]">
        <MarketingHeader userEmail={userEmail} />
        <div className="pb-20">{children}</div>
        {config.showFooter ? <MarketingFooter /> : null}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--rb-bg)] text-[var(--rb-fg)]">
      {!isMobile ? (
        <aside
          className="fixed inset-y-0 left-0 z-40 w-[296px] border-r border-[color:rgba(222,230,242,0.08)] bg-[rgba(15,20,27,0.9)] px-5 py-6 backdrop-blur-xl"
          aria-label="주요 메뉴"
        >
          <SidebarNav variant="app" plan={plan} userEmail={userEmail} firstLinkRef={drawerFirstLinkRef} onNavigate={() => setOpen(false)} />
        </aside>
      ) : null}

      {isMobile ? (
        <>
          <button
            type="button"
            className="fixed right-5 top-5 z-50 rounded-[14px] border border-[color:var(--rb-border)] bg-[var(--rb-surface)] px-4 py-2 text-sm text-[var(--rb-fg)] xl:hidden"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-controls="workspace-navigation"
            aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
          >
            {open ? "닫기" : "메뉴"}
          </button>
          {open ? (
            <>
              <div className="fixed inset-0 z-30 bg-[rgba(0,0,0,0.55)] xl:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
              <aside
                id="workspace-navigation"
                aria-label="주요 메뉴"
                className="fixed inset-y-0 left-0 z-40 w-[296px] border-r border-[color:rgba(222,230,242,0.08)] bg-[rgba(15,20,27,0.96)] px-5 py-6 backdrop-blur-xl xl:hidden"
              >
                <SidebarNav variant="app" plan={plan} userEmail={userEmail} firstLinkRef={drawerFirstLinkRef} onNavigate={() => setOpen(false)} />
              </aside>
            </>
          ) : null}
        </>
      ) : null}

      <div className="xl:pl-[296px]">
        <ShellContainer className="py-6 md:py-8">
          {config.showHeader ? (
            <header className="mb-8 flex flex-col gap-4 border-b border-[color:rgba(222,230,242,0.08)] pb-5 md:flex-row md:items-end md:justify-between">
              <div>
                {config.label ? <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{config.label}</p> : null}
                <h1 className="mt-2 text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.06em] text-[var(--rb-fg)]">{config.title}</h1>
                {config.description ? <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--rb-muted-strong)]">{config.description}</p> : null}
              </div>
              <div className="flex items-center gap-3">
                <LanguageSwitcher />
                {config.actionHref && config.actionLabel ? (
                  <Link href={config.actionHref} className={buttonStyles({ variant: "secondary" })}>
                    {config.actionLabel}
                  </Link>
                ) : null}
              </div>
            </header>
          ) : null}

          <div>{children}</div>
        </ShellContainer>
      </div>
    </div>
  );
}
