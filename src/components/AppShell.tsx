"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/navigation/SidebarNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer } from "@/components/ui/Primitives";
import { EXTENSION_STORE_URL } from "@/lib/extension";
import type { PlanTier } from "@/types/user";

type AppShellProps = {
  children: React.ReactNode;
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
  isAuth?: boolean;
};

function getChromeConfig(pathname: string): ChromeConfig {
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  ) {
    return {
      title: "ReviewBoost",
      showHeader: false,
      showFooter: false,
      isWorkspace: false,
      isAuth: true
    };
  }

  if (pathname.startsWith("/dashboard/analysis/")) {
    return {
      label: "저장된 분석",
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
      label: "홈",
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
      label: "작업 홈",
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
      label: "분석 흐름",
      title: "AI분석",
      description: "업로드, 열 확인, 분석 진행, 결과 확인을 같은 흐름으로 진행합니다.",
      actionHref: "/dashboard",
      actionLabel: "홈",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname.startsWith("/features")) {
    return {
      label: "기능",
      title: "핵심 기능",
      description: "리뷰 분석, CSV 확보, 부정리뷰 대응, FAQ 운영 기능을 한 번에 살펴볼 수 있습니다.",
      actionHref: "/dashboard/analyze",
      actionLabel: "분석 시작",
      showHeader: true,
      showFooter: true,
      isWorkspace: false
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
    <header className="sticky top-0 z-40 border-b border-[color:#e6e8f2] bg-[rgba(255,255,255,0.85)] backdrop-blur-xl">
      <ShellContainer className="flex h-18 items-center justify-between gap-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3">
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
              <span className="block text-[11px] text-[var(--rb-muted)]">셀러를 위한 AI 리뷰 분석</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm text-[var(--rb-muted-strong)] lg:flex">
            <Link href="/features" className="hover:text-[var(--rb-fg)]">기능</Link>
            <Link href="/pricing" className="hover:text-[var(--rb-fg)]">요금제</Link>
            <a href={EXTENSION_STORE_URL} target="_blank" rel="noreferrer" className="hover:text-[var(--rb-fg)]">Chrome 확장프로그램</a>
            <Link href="/help" className="hover:text-[var(--rb-fg)]">사용법</Link>
            <Link href="/blog" className="hover:text-[var(--rb-fg)]">블로그</Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {userEmail ? (
            <Link href="/dashboard" className={buttonStyles({ variant: "secondary", size: "sm" })}>
              대시보드
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
    <footer className="border-t border-[color:#e6e8f2] py-12">
      <ShellContainer>
        <div className="grid gap-8 text-sm text-[var(--rb-muted-strong)] md:grid-cols-3">
          <div>
            <h2 className="text-base font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">ReviewBoost</h2>
            <p className="mt-3 max-w-xs leading-7">쿠팡과 스마트스토어 셀러를 위한 AI 리뷰 분석 작업면.</p>
          </div>
          <div className="space-y-3">
            <Link href="/dashboard/analyze" className="block hover:text-[var(--rb-fg)]">분석하기</Link>
            <Link href="/features" className="block hover:text-[var(--rb-fg)]">기능</Link>
            <Link href="/pricing" className="block hover:text-[var(--rb-fg)]">요금제</Link>
            <Link href="/help" className="block hover:text-[var(--rb-fg)]">사용법</Link>
          </div>
          <div className="space-y-3">
            <Link href="/terms" className="block hover:text-[var(--rb-fg)]">서비스 이용약관</Link>
            <Link href="/privacy" className="block hover:text-[var(--rb-fg)]">개인정보 처리방침</Link>
            <Link href="/support" className="block hover:text-[var(--rb-fg)]">1:1 문의</Link>
            <a href="mailto:kwan765@naver.com" className="block hover:text-[var(--rb-fg)]">문의: kwan765@naver.com</a>
          </div>
        </div>

        <div className="mt-10 border-t border-[color:#e6e8f2] pt-6 text-xs leading-6 text-[var(--rb-muted)]">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className="font-medium text-[var(--rb-muted-strong)]">온누리문방구</span>
            <span>대표 김기완</span>
            <span>사업자등록번호 892-02-03657</span>
            <span>통신판매업신고 제2025-경기광명-0525호</span>
            <span>경기도 고양시 일산동구 일산로463번길 12, 204동 103호</span>
            <span>전화 010-8555-8219</span>
            <span>이메일 kwan765@naver.com</span>
          </div>
          <p className="mt-3">© 2026 ReviewBoost · 온누리문방구. All rights reserved.</p>
        </div>
      </ShellContainer>
    </footer>
  );
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const config = useMemo(() => getChromeConfig(pathname), [pathname]);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PlanTier>("free");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const drawerFirstLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    let active = true;

    fetch("/api/navigation-session", { cache: "no-store", credentials: "same-origin" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as { plan?: PlanTier; userEmail?: string | null } | null;
      })
      .then((session) => {
        if (!active || !session) return;
        setPlan(session.plan === "basic" || session.plan === "pro" ? session.plan : "free");
        setUserEmail(typeof session.userEmail === "string" ? session.userEmail : null);
      })
      .catch(() => {
        // Public shell falls back to guest mode when auth lookup is unavailable.
      });

    return () => {
      active = false;
    };
  }, [pathname]);

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
    if (config.isAuth) {
      return <div className="min-h-screen bg-[var(--rb-bg)] text-[var(--rb-fg)]">{children}</div>;
    }

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
          className="fixed inset-y-0 left-0 z-40 w-[296px] border-r border-[color:#e6e8f2] bg-white px-5 py-6 backdrop-blur-xl"
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
              <div className="fixed inset-0 z-30 bg-[rgba(31,37,64,0.45)] xl:hidden" onClick={() => setOpen(false)} aria-hidden="true" />
              <aside
                id="workspace-navigation"
                aria-label="주요 메뉴"
                className="fixed inset-y-0 left-0 z-40 w-[296px] border-r border-[color:#e6e8f2] bg-white px-5 py-6 backdrop-blur-xl xl:hidden"
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
            <header className="mb-8 flex flex-col gap-4 border-b border-[color:#e6e8f2] pb-5 md:flex-row md:items-end md:justify-between">
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
