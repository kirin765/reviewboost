"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

export default function DashboardShell({ children }: { children: React.ReactNode }) {
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
        description: "CSV 업로드·미리보기·분석"
      },
      {
        href: "/dashboard/history",
        label: "저장된 리포트",
        description: "이전 분석 결과 확인"
      }
    ],
    []
  );

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
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "❮" : "≡"}
        </button>

        <aside
          id="dashboardDrawer"
          className="dashboardDrawer"
          aria-label="대시보드 탐색"
          aria-hidden={!open}
        >
          <div className="drawerBrand">ReviewBoost 분석도구</div>
          <p className="drawerSubtext">리뷰 분석 작업을 빠르게 이동하세요.</p>
          <nav aria-label="대시보드 메뉴">
            <ul className="drawerNav">
              {navItems.map((item) => (
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
                    <span>{item.label}</span>
                    <span>{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
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
            <a className="dashboardTopHome" href="/" onClick={() => setOpen(false)}>
              <span aria-hidden>↩︎</span>
              <span>리뷰분석 홈으로 이동</span>
            </a>
            <span className="dashboardTopHint">대시보드 작업 후에도 원래 화면으로 바로 복귀</span>
          </div>
          {children}
        </main>
      </div>
    </section>
  );
}
