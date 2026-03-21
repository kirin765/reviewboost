"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import SidebarNav from "@/components/navigation/SidebarNav";
import type { PlanTier } from "@/types/user";
import { useTranslation } from "@/lib/i18n";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
  plan?: PlanTier;
};

export default function DashboardShell({ children, userEmail = null, plan = "free" }: DashboardShellProps) {
  const pathname = usePathname();
  const { locale } = useTranslation();
  const [open, setOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const hasMounted = useRef(false);
  const drawerFirstLinkRef = useRef<HTMLAnchorElement | null>(null);
  const toggleButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    document.body.classList.add("dashboardMode");

    const getIsMobile = () => (typeof window === "undefined" ? false : window.innerWidth < 1100);

    const updateDeviceMode = () => {
      const nextIsMobile = getIsMobile();
      setIsMobile((prevIsMobile) => {
        if (prevIsMobile === nextIsMobile) return prevIsMobile;

        if (nextIsMobile) {
          setOpen(false);
        } else {
          setOpen(true);
        }

        return nextIsMobile;
      });
    };

    updateDeviceMode();

    window.addEventListener("resize", updateDeviceMode);

    return () => {
      window.removeEventListener("resize", updateDeviceMode);
      document.body.classList.remove("dashboardMode");
    };
  }, []);

  useEffect(() => {
    if (!open || !isMobile) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isMobile]);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (open) {
      if (drawerFirstLinkRef.current) drawerFirstLinkRef.current.focus();
    } else {
      toggleButtonRef.current?.focus();
    }
  }, [open]);

  const currentArea = useMemo(() => {
    if (pathname.startsWith("/dashboard/history")) return "History";
    if (pathname.startsWith("/dashboard/analysis/")) return "Saved report";
    return "Analysis";
  }, [pathname]);

  return (
    <section className={`dashboardShell ${open ? "isOpen" : "isClosed"}`}>
      <div className="dashboardShellInner">
        <button
          ref={toggleButtonRef}
          type="button"
          className="drawerToggle"
          aria-expanded={open}
          aria-controls="dashboardDrawer"
          aria-label={open ? (locale === "en" ? "Close sidebar" : "사이드바 닫기") : (locale === "en" ? "Open sidebar" : "사이드바 펼치기")}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <aside id="dashboardDrawer" className="dashboardDrawer" aria-label={locale === "en" ? "Dashboard navigation" : "대시보드 탐색"} aria-hidden={!open}>
          <SidebarNav
            variant="dashboard"
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
          className="drawerBackdrop"
          data-testid="dashboardBackdrop"
          onClick={() => setOpen(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(false);
            }
          }}
          hidden={!isMobile || !open}
          aria-hidden={!isMobile || !open}
          aria-label={locale === "en" ? "Close dashboard navigation" : "대시보드 내비게이션 닫기"}
          tabIndex={open ? -1 : -1}
        />

        <main className="dashboardMain" role="main">
          <div className="dashboardTopBar">
            <div>
              <a className="dashboardTopHome" href="/" onClick={() => setOpen(false)}>
                {locale === "en" ? "Go to main page" : "메인 서비스로 이동"}
              </a>
              <span className="dashboardTopHint">ReviewBoost workspace</span>
            </div>
            <div className="dashboardTopBadgeRow">
              <span className="dashboardTopBadge">AI Review Ops</span>
              <span className="dashboardTopMeta">{currentArea}</span>
            </div>
          </div>
          {children}
        </main>
      </div>
    </section>
  );
}
