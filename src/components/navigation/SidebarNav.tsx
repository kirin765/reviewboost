"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { planLabel, type PlanTier } from "@/lib/plan";

export type SidebarVariant = "app" | "dashboard";

type SidebarNavItem = {
  href: string;
  icon: "home" | "analyze" | "csv";
  label: string;
  matches: (pathname: string) => boolean;
};

type SidebarNavProps = {
  variant: SidebarVariant;
  plan: PlanTier;
  userEmail: string | null;
  firstLinkRef?: React.Ref<HTMLAnchorElement>;
  onNavigate?: () => void;
};

const PRIMARY_ITEMS: SidebarNavItem[] = [
  {
    href: "/dashboard",
    icon: "home",
    label: "홈",
    matches: (pathname) =>
      pathname === "/dashboard" || pathname.startsWith("/dashboard/history") || pathname.startsWith("/dashboard/analysis/")
  },
  {
    href: "/dashboard/analyze",
    icon: "analyze",
    label: "AI분석",
    matches: (pathname) => pathname.startsWith("/dashboard/analyze")
  },
  {
    href: "/coupang-csv",
    icon: "csv",
    label: "리뷰 다운",
    matches: (pathname) => pathname.startsWith("/coupang-csv")
  }
];

const SECONDARY_LINKS = [
  { href: "/pricing", label: "요금제" },
  { href: "/help", label: "사용법" },
  { href: "/blog", label: "블로그" }
];

function humanizeToken(token: string) {
  if (!token) return "";
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function getDisplayName(userEmail: string | null) {
  if (!userEmail) return "게스트";
  const local = userEmail.split("@")[0]?.trim() ?? "";
  if (!local) return "게스트";

  const parts = local
    .split(/[._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return "게스트";
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
    case "home":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4.5 9.2 10 4.75l5.5 4.45v6.05a1 1 0 0 1-1 1H5.5a1 1 0 0 1-1-1V9.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8.1 15.2v-3.3h3.8v3.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "analyze":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M4.75 15.25h10.5a1.5 1.5 0 0 0 1.5-1.5v-7.5a1.5 1.5 0 0 0-1.5-1.5H4.75a1.5 1.5 0 0 0-1.5 1.5v7.5a1.5 1.5 0 0 0 1.5 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M6.8 12.3v-2.2M10 12.3V7.8M13.2 12.3V9.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    case "csv":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path d="M6 3.75h5.6l2.65 2.65v9.85a1.05 1.05 0 0 1-1.05 1.05H6a1.05 1.05 0 0 1-1.05-1.05V4.8A1.05 1.05 0 0 1 6 3.75Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M11.6 3.75v2.7a.9.9 0 0 0 .9.9h2.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.1 10.1h5.8M7.1 12.7h5.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return null;
  }
}

export default function SidebarNav({
  plan,
  userEmail,
  firstLinkRef,
  onNavigate
}: SidebarNavProps) {
  const pathname = usePathname();
  const displayName = getDisplayName(userEmail);
  const initials = getInitials(displayName);
  const currentPlanLabel = planLabel(plan);
  const isAuthenticated = Boolean(userEmail);

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="rounded-[22px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.03)] p-4">
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <span className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[var(--rb-accent)] text-[#071112]">
            <svg viewBox="0 0 52 52" className="h-6 w-6">
              <circle cx="26" cy="26" r="24" fill="currentColor" />
              <path d="M14 31.5 23.8 25l8.1 4.1L39 19.4" fill="none" stroke="#071112" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="24" cy="25" r="2.8" fill="#071112" />
              <circle cx="38.3" cy="19.7" r="2.8" fill="#071112" />
              <circle cx="14.2" cy="31.5" r="2.8" fill="#071112" />
            </svg>
          </span>
          <div>
            <strong className="text-base font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">ReviewBoost</strong>
            <p className="mt-1 text-xs text-[var(--rb-muted)]">리뷰 분석 작업면</p>
          </div>
        </Link>
      </div>

      <nav aria-label="주요 메뉴" className="space-y-2">
        {PRIMARY_ITEMS.map((item, index) => {
          const active = item.matches(pathname);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[16px] border px-4 py-3.5 text-sm transition",
                active
                  ? "border-[color:rgba(107,210,193,0.3)] bg-[rgba(107,210,193,0.1)] text-[var(--rb-fg)]"
                  : "border-transparent bg-transparent text-[var(--rb-muted-strong)] hover:border-[color:rgba(222,230,242,0.08)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--rb-fg)]"
              )}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              ref={index === 0 ? firstLinkRef : undefined}
            >
              <span className="h-5 w-5 shrink-0">{renderIcon(item.icon)}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-[22px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.03)] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">바로가기</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm text-[var(--rb-muted-strong)]">
          {SECONDARY_LINKS.map((item) => (
            <Link key={item.href} href={item.href} className="hover:text-[var(--rb-fg)]" onClick={onNavigate}>
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="rounded-[22px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.03)] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">플랜</p>
        <p className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{plan === "pro" ? "현재 Pro 작업면" : "반복 분석이 늘면 업그레이드"}</p>
        <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">
          {plan === "pro"
            ? "저장, 공유, 반복 분석 기능을 같은 워크플로에서 사용할 수 있습니다."
            : "저장된 분석과 더 많은 처리량이 필요할 때 Basic 또는 Pro로 확장할 수 있습니다."}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link href="/pricing" className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={onNavigate}>
            {plan === "pro" ? "플랜 보기" : "업그레이드"}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="mt-auto rounded-[22px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.03)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.06)] text-sm font-semibold text-[var(--rb-fg)]">
            {initials}
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-sm font-medium text-[var(--rb-fg)]">{displayName}</strong>
            <span className="block truncate text-xs text-[var(--rb-muted)]">{isAuthenticated ? `${currentPlanLabel} 플랜` : "로그인하고 리포트 저장하기"}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <form action={signOutAction}>
              <button type="submit" className={buttonStyles({ variant: "ghost", size: "sm" })}>로그아웃</button>
            </form>
          ) : (
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={onNavigate}>
              로그인
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
