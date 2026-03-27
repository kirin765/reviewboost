"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import SidebarNav from "@/components/navigation/SidebarNav";
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
      description: "저장된 리포트를 다시 확인하고 필요한 경우 바로 다운로드합니다.",
      actionHref: "/dashboard/history",
      actionLabel: "목록으로",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname.startsWith("/dashboard/history")) {
    return {
      label: "Saved reports",
      title: "저장된 리포트",
      description: "최근 분석 결과를 빠르게 다시 열어봅니다.",
      actionHref: "/dashboard",
      actionLabel: "새 분석",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname === "/dashboard") {
    return {
      label: "Workspace",
      title: "리뷰 CSV 분석",
      description: "업로드, 열 매핑, 분석, 결과 확인까지 한 흐름으로 진행합니다.",
      actionHref: "/dashboard/history",
      actionLabel: "저장된 리포트",
      showHeader: true,
      showFooter: false,
      isWorkspace: true
    };
  }

  if (pathname.startsWith("/pricing")) {
    return {
      label: "Pricing",
      title: "요금제",
      description: "운영 규모에 맞는 플랜을 비교하고 바로 시작할 수 있습니다.",
      actionHref: "/dashboard",
      actionLabel: "분석 시작",
      showHeader: true,
      showFooter: true,
      isWorkspace: false
    };
  }

  if (pathname.startsWith("/help")) {
    return {
      label: "Guide",
      title: "사용 가이드",
      description: "CSV 준비부터 결과 활용까지 핵심 흐름만 빠르게 확인합니다.",
      actionHref: "/dashboard",
      actionLabel: "분석 시작",
      showHeader: true,
      showFooter: true,
      isWorkspace: false
    };
  }

  if (pathname.startsWith("/blog")) {
    return {
      label: "Blog",
      title: "실전 운영 가이드",
      description: "리뷰 운영과 개선 전략을 실무 중심으로 정리한 글 모음입니다.",
      actionHref: "/dashboard",
      actionLabel: "분석 시작",
      showHeader: true,
      showFooter: true,
      isWorkspace: false
    };
  }

  if (pathname === "/" || pathname.startsWith("/login") || pathname.startsWith("/signup") || pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password")) {
    return {
      title: "ReviewBoost",
      showHeader: false,
      showFooter: pathname === "/",
      isWorkspace: false
    };
  }

  return {
    label: "ReviewBoost",
    title: "ReviewBoost",
    description: "리뷰 운영 워크플로를 한 화면에서 관리합니다.",
    showHeader: false,
    showFooter: true,
    isWorkspace: false
  };
}

export default function AppShell({ children, userEmail = null, plan = "free" }: AppShellProps) {
  const pathname = usePathname();
  const config = useMemo(() => getChromeConfig(pathname), [pathname]);
  const [isMobile, setIsMobile] = useState(false);
  const [open, setOpen] = useState(false);
  const drawerFirstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const updateDeviceMode = () => {
      const nextIsMobile = window.innerWidth < 1100;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setOpen(false);
      }
    };

    updateDeviceMode();
    window.addEventListener("resize", updateDeviceMode);

    return () => window.removeEventListener("resize", updateDeviceMode);
  }, []);

  useEffect(() => {
    if (!(isMobile && open)) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMobile, open]);

  useEffect(() => {
    document.body.classList.toggle("appChromeNavOpen", isMobile && open);
    return () => document.body.classList.remove("appChromeNavOpen");
  }, [isMobile, open]);

  useEffect(() => {
    if (!isMobile) return;

    if (open) {
      drawerFirstLinkRef.current?.focus();
      return;
    }

    toggleButtonRef.current?.focus();
  }, [isMobile, open]);

  const showToolbar = config.showHeader || isMobile;

  return (
    <div className={`appChrome ${config.isWorkspace ? "appChromeWorkspace" : "appChromeContent"}`}>
      <aside
        id="app-navigation"
        className={`appChromeNav ${isMobile ? "appChromeNavMobile" : ""} ${isMobile && open ? "isOpen" : ""}`}
        aria-label="주요 메뉴"
        aria-hidden={isMobile ? !open : undefined}
      >
        <SidebarNav
          variant="app"
          plan={plan}
          userEmail={userEmail}
          firstLinkRef={drawerFirstLinkRef}
          onNavigate={() => {
            if (isMobile) {
              setOpen(false);
            }
          }}
        />
      </aside>

      <button
        type="button"
        className="appChromeBackdrop"
        data-testid="appShellBackdrop"
        hidden={!isMobile || !open}
        aria-hidden={!isMobile || !open}
        aria-label="메뉴 닫기"
        onClick={() => setOpen(false)}
      />

      <div className="appChromeMain">
        {showToolbar ? (
          <header className={`appChromeHeader ${config.showHeader ? "" : "appChromeHeaderUtility"}`}>
            <div className="appChromeHeaderInner">
              <div className="appChromeHeaderLead">
                {isMobile ? (
                  <button
                    ref={toggleButtonRef}
                    type="button"
                    className="appChromeMenuButton"
                    aria-expanded={open}
                    aria-controls="app-navigation"
                    aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
                    onClick={() => setOpen((value) => !value)}
                  >
                    {open ? "Close" : "Menu"}
                  </button>
                ) : null}

                <div className="appChromeHeaderCopy">
                  {config.showHeader && config.label ? <p className="appChromeEyebrow">{config.label}</p> : null}
                  <h1 className="appChromeHeaderTitle">{config.showHeader ? config.title : "ReviewBoost"}</h1>
                  {config.showHeader && config.description ? <p className="appChromeHeaderDescription">{config.description}</p> : null}
                </div>
              </div>

              {config.showHeader && config.actionHref && config.actionLabel ? (
                <div className="appChromeHeaderActions">
                  <a className="btn btnPrimary" href={config.actionHref}>
                    {config.actionLabel}
                  </a>
                </div>
              ) : null}
            </div>
          </header>
        ) : null}

        <div className={`appChromeStage ${config.isWorkspace ? "appChromeStageWorkspace" : ""}`}>{children}</div>

        {config.showFooter ? (
          <footer className="appChromeFooter" aria-label="사이트 정보">
            <div className="appChromeFooterSection">
              <h2>ReviewBoost</h2>
              <a href="/dashboard">분석하기</a>
              <a href="/help">사용법</a>
              <a href="/pricing">요금제</a>
            </div>
            <div className="appChromeFooterSection">
              <h2>정책</h2>
              <a href="/term">서비스 이용약관</a>
              <a href="/privacy">개인정보 처리방침</a>
            </div>
            <div className="appChromeFooterSection">
              <h2>지원</h2>
              <a href="mailto:support@reviewboost.co.kr">support@reviewboost.co.kr</a>
            </div>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
