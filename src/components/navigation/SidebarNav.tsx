"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import { planLabel, type PlanTier } from "@/lib/plan";

export type SidebarVariant = "app" | "dashboard";

export type SidebarNavItem = {
  href: string;
  icon: "dashboard" | "history" | "pricing" | "help" | "blog";
  label: string;
  matches: (pathname: string) => boolean;
};

export type SidebarFooterState = {
  plan: PlanTier;
  userEmail: string | null;
};

type SidebarNavProps = SidebarFooterState & {
  variant: SidebarVariant;
  firstLinkRef?: React.Ref<HTMLAnchorElement>;
  onNavigate?: () => void;
};

const NAV_ITEMS: SidebarNavItem[] = [
  {
    href: "/dashboard",
    icon: "dashboard",
    label: "분석하기",
    matches: (pathname) => pathname === "/dashboard"
  },
  {
    href: "/dashboard/history",
    icon: "history",
    label: "저장된 리포트",
    matches: (pathname) => pathname.startsWith("/dashboard/history") || pathname.startsWith("/dashboard/analysis/")
  },
  {
    href: "/pricing",
    icon: "pricing",
    label: "요금제",
    matches: (pathname) => pathname.startsWith("/pricing")
  },
  {
    href: "/help",
    icon: "help",
    label: "사용법",
    matches: (pathname) => pathname.startsWith("/help")
  },
  {
    href: "/blog",
    icon: "blog",
    label: "블로그",
    matches: (pathname) => pathname.startsWith("/blog")
  }
];

function humanizeToken(token: string) {
  if (!token) return "";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function getDisplayName(userEmail: string | null) {
  if (!userEmail) return "Guest";
  const local = userEmail.split("@")[0]?.trim() ?? "";
  if (!local) return "Guest";
  const parts = local
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "Guest";
  return parts.map(humanizeToken).join(" ");
}

function getInitials(label: string) {
  const parts = label
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "G";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function renderIcon(icon: SidebarNavItem["icon"]) {
  switch (icon) {
    case "dashboard":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M4.75 15.25h10.5a1.5 1.5 0 0 0 1.5-1.5v-7.5a1.5 1.5 0 0 0-1.5-1.5H4.75a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M6.8 12.3v-2.2M10 12.3V7.8M13.2 12.3V9.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "history":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M6.25 3.75h5.7l2.8 2.8v7.2a1.5 1.5 0 0 1-1.5 1.5H6.25a1.5 1.5 0 0 1-1.5-1.5v-8.5a1.5 1.5 0 0 1 1.5-1.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11.75 3.9v2.5a1 1 0 0 0 1 1h2.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.5 10h5M7.5 12.8h5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "pricing":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 4.25c-2.9 0-5.25.84-5.25 1.88S7.1 8 10 8s5.25-.84 5.25-1.87S12.9 4.25 10 4.25Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M4.75 10c0 1.04 2.35 1.88 5.25 1.88s5.25-.84 5.25-1.88M4.75 13.87c0 1.04 2.35 1.88 5.25 1.88s5.25-.84 5.25-1.88" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M4.75 6.13v7.74M15.25 6.13v7.74" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "help":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 16.25a6.25 6.25 0 1 0 0-12.5 6.25 6.25 0 0 0 0 12.5Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M8.45 8.1a1.8 1.8 0 1 1 2.64 1.58c-.66.34-1.09.7-1.09 1.57" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 13.65h.01" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "blog":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M5.5 4.75h9a1.75 1.75 0 0 1 1.75 1.75v7a1.75 1.75 0 0 1-1.75 1.75h-9a1.75 1.75 0 0 1-1.75-1.75v-7A1.75 1.75 0 0 1 5.5 4.75Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M6.75 7.5h6.5M6.75 10h6.5M6.75 12.5h4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function SidebarNav({
  variant,
  plan,
  userEmail,
  firstLinkRef,
  onNavigate
}: SidebarNavProps) {
  const pathname = usePathname();
  const isAuthenticated = Boolean(userEmail);
  const items = isAuthenticated ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== "/dashboard/history");
  const currentPlanLabel = planLabel(plan);
  const displayName = getDisplayName(userEmail);
  const initials = getInitials(displayName);
  const promoLabel = plan === "pro" ? "View Plans" : "Upgrade Now";
  const promoTitle = plan === "pro" ? "Current Pro workspace" : "Unlock faster review ops";
  const promoCopy =
    plan === "pro"
      ? "현재 플랜 구성과 공유 동선을 다시 확인할 수 있습니다."
      : "더 많은 분석, 저장된 리포트, 공유 기능을 같은 워크플로에서 열어보세요.";

  return (
    <div className={`sidebarNav sidebarNav${variant === "dashboard" ? "Drawer" : "Rail"}`}>
      <div className="sidebarNavMain">
        <Link
          href={variant === "dashboard" ? "/dashboard" : "/"}
          className="sidebarNavBrand"
          onClick={onNavigate}
        >
          <span className="sidebarNavBrandMark" aria-hidden="true">
            <svg viewBox="0 0 52 52">
              <circle cx="26" cy="26" r="24" />
              <path d="M14 31.5 23.8 25l8.1 4.1L39 19.4" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="25" r="2.8" />
              <circle cx="38.3" cy="19.7" r="2.8" />
              <circle cx="14.2" cy="31.5" r="2.8" />
            </svg>
          </span>
          <span className="sidebarNavBrandText">
            <strong>ReviewBoost</strong>
          </span>
        </Link>

        <nav aria-label={variant === "dashboard" ? "대시보드 메뉴" : "주요 메뉴"}>
          <ul className="sidebarNavList">
            {items.map((item, index) => {
              const active = item.matches(pathname);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`sidebarNavLink ${active ? "sidebarNavLinkActive" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={onNavigate}
                    ref={index === 0 ? firstLinkRef : undefined}
                  >
                    <span className="sidebarNavIcon" aria-hidden="true">
                      {renderIcon(item.icon)}
                    </span>
                    <span className="sidebarNavLabel">{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      <div className="sidebarNavFooter">
        <section className="sidebarNavPromo" aria-label="업그레이드 안내">
          <div className="sidebarNavPromoVisual" aria-hidden="true">
            <span className="sidebarNavPromoStem" />
            <span className="sidebarNavPromoCone" />
            <span className="sidebarNavPromoGlow" />
          </div>
          <div className="sidebarNavPromoCopy">
            <strong>{promoTitle}</strong>
            <p>{promoCopy}</p>
          </div>
          <Link href="/pricing" className="sidebarNavPromoButton" onClick={onNavigate}>
            {promoLabel}
          </Link>
        </section>

        <div className="sidebarNavAccount">
          <div className={`sidebarNavAvatar ${isAuthenticated ? "" : "sidebarNavAvatarGuest"}`}>{initials}</div>
          <div className="sidebarNavAccountText">
            <strong>{displayName}</strong>
            <span>{isAuthenticated ? `${currentPlanLabel} Account` : "로그인 후 리포트 저장"}</span>
          </div>
          {isAuthenticated ? (
            <form action={signOutAction} className="sidebarNavAccountAction">
              <button type="submit" className="sidebarNavActionButton" aria-label="로그아웃">
                <svg viewBox="0 0 20 20" aria-hidden="true">
                  <path d="M7.5 5.2H5.8A1.8 1.8 0 0 0 4 7v6a1.8 1.8 0 0 0 1.8 1.8h1.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M10.2 6.5 14 10l-3.8 3.5M14 10H7.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          ) : (
            <Link href="/login" className="sidebarNavActionButton sidebarNavLoginButton" onClick={onNavigate}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
