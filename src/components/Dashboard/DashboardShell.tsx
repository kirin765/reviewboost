"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { signOutAction } from "@/app/(auth)/actions";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail?: string | null;
};

export default function DashboardShell({ children, userEmail = null }: DashboardShellProps) {
  const pathname = usePathname();
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

  const navItems = useMemo(
    () => [
      {
        href: "/dashboard",
        label: "분석하기",
        description: "CSV 업로드와 결과 워크플로"
      },
      {
        href: "/dashboard/history",
        label: "저장된 리포트",
        description: "이전 분석 결과와 PDF 다시 보기"
      }
    ],
    []
  );

  const currentArea = useMemo(() => {
    if (pathname.startsWith("/dashboard/history")) return "History";
    if (pathname.startsWith("/dashboard/analysis/")) return "Saved report";
    return "Analysis";
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <section className={`dashboardShell ${open ? "isOpen" : "isClosed"}`}>
      <div className="dashboardShellInner">
        <button
          ref={toggleButtonRef}
          type="button"
          className="drawerToggle"
          aria-expanded={open}
          aria-controls="dashboardDrawer"
          aria-label={open ? "사이드바 닫기" : "사이드바 펼치기"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Close" : "Menu"}
        </button>

        <aside id="dashboardDrawer" className="dashboardDrawer" aria-label="대시보드 탐색" aria-hidden={!open}>
          <a className="dashboardBrand" href="/dashboard">
            <span className="dashboardBrandMark" aria-hidden="true">
              <span className="dashboardBrandDot" />
              <span className="dashboardBrandLine dashboardBrandLineOne" />
              <span className="dashboardBrandLine dashboardBrandLineTwo" />
            </span>
            <span>
              <strong>ReviewBoost</strong>
              <small>analysis workspace</small>
            </span>
          </a>

          <div className="dashboardDrawerPanel">
            <p className="dashboardDrawerEyebrow">Dashboard</p>
            <nav aria-label="대시보드 메뉴">
              <ul className="drawerNav">
                {navItems.map((item, index) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`drawerLink ${isActive(item.href) ? "drawerLinkActive" : ""}`}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      ref={item.href === "/dashboard" ? drawerFirstLinkRef : null}
                      onClick={() => {
                        if (isMobile) {
                          setOpen(false);
                        }
                      }}
                    >
                      <span className="drawerLinkIndex">0{index + 1}</span>
                      <span>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          <div className="dashboardDrawerInfo">
            <p>리뷰 업로드, 열 매핑, 실행 결과, 공유 리포트를 한 흐름으로 관리합니다.</p>
          </div>

          {userEmail ? (
            <div className="dashboardDrawerActionStack">
              <span className="dashboardDrawerEmail" title={userEmail}>
                {userEmail}
              </span>
              <form className="dashboardDrawerAction" action={signOutAction}>
                <button className="dashboardDrawerSignOut" type="submit" aria-label="로그아웃">
                  로그아웃
                </button>
              </form>
            </div>
          ) : null}
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
          aria-label="대시보드 내비게이션 닫기"
          tabIndex={open ? -1 : -1}
        />

        <main className="dashboardMain" role="main">
          <div className="dashboardTopBar">
            <div>
              <a className="dashboardTopHome" href="/" onClick={() => setOpen(false)}>
                메인 서비스로 이동
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
