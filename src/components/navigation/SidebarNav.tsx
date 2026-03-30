"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(auth)/actions";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { buttonStyles } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { planLabel, type PlanTier } from "@/lib/plan";
import { useTranslation } from "@/lib/i18n";

export type SidebarVariant = "app" | "dashboard";

type SidebarNavItem = {
  href: string;
  icon: "dashboard" | "csv" | "history" | "pricing" | "help" | "blog";
  labelKey: string;
  matches: (pathname: string) => boolean;
};

type SidebarNavProps = {
  variant: SidebarVariant;
  plan: PlanTier;
  userEmail: string | null;
  firstLinkRef?: React.Ref<HTMLAnchorElement>;
  onNavigate?: () => void;
};

const NAV_ITEMS: SidebarNavItem[] = [
  {
    href: "/dashboard",
    icon: "dashboard",
    labelKey: "nav.analyze",
    matches: (pathname) => pathname === "/dashboard"
  },
  {
    href: "/coupang-csv",
    icon: "csv",
    labelKey: "nav.coupangCsv",
    matches: (pathname) => pathname.startsWith("/coupang-csv")
  },
  {
    href: "/dashboard/history",
    icon: "history",
    labelKey: "nav.savedReports",
    matches: (pathname) => pathname.startsWith("/dashboard/history") || pathname.startsWith("/dashboard/analysis/")
  },
  {
    href: "/pricing",
    icon: "pricing",
    labelKey: "nav.pricing",
    matches: (pathname) => pathname.startsWith("/pricing")
  },
  {
    href: "/help",
    icon: "help",
    labelKey: "nav.help",
    matches: (pathname) => pathname.startsWith("/help")
  },
  {
    href: "/blog",
    icon: "blog",
    labelKey: "nav.blog",
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
    case "csv":
      return (
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M6 3.75h5.6l2.65 2.65v9.85a1.05 1.05 0 0 1-1.05 1.05H6a1.05 1.05 0 0 1-1.05-1.05V4.8A1.05 1.05 0 0 1 6 3.75Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path d="M11.6 3.75v2.7a.9.9 0 0 0 .9.9h2.7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M7.1 10.1h5.8M7.1 12.7h5.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
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
  plan,
  userEmail,
  firstLinkRef,
  onNavigate
}: SidebarNavProps) {
  const pathname = usePathname();
  const { t } = useTranslation();
  const isAuthenticated = Boolean(userEmail);
  const items = isAuthenticated ? NAV_ITEMS : NAV_ITEMS.filter((item) => item.href !== "/dashboard/history");
  const currentPlanLabel = planLabel(plan);
  const displayName = getDisplayName(userEmail);
  const initials = getInitials(displayName);
  const promoTitle = plan === "pro" ? t("sidebar.promoTitlePro") : t("sidebar.promoTitleOther");
  const promoCopy = plan === "pro" ? t("sidebar.promoCopyPro") : t("sidebar.promoCopyOther");
  const promoLabel = plan === "pro" ? t("sidebar.promoButtonPro") : t("sidebar.promoButtonOther");

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="rounded-[18px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-4">
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
            <p className="mt-1 text-xs text-[var(--rb-muted)]">AI review operations</p>
          </div>
        </Link>
      </div>

      <nav aria-label={t("nav.mainMenu")} className="space-y-2">
        {items.map((item, index) => {
          const active = item.matches(pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-[14px] border px-4 py-3 text-sm transition",
                active
                  ? "border-[color:rgba(95,198,183,0.28)] bg-[rgba(95,198,183,0.08)] text-[var(--rb-fg)]"
                  : "border-transparent bg-transparent text-[var(--rb-muted-strong)] hover:border-[color:rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--rb-fg)]"
              )}
              aria-current={active ? "page" : undefined}
              onClick={onNavigate}
              ref={index === 0 ? firstLinkRef : undefined}
            >
              <span className="h-5 w-5 shrink-0">{renderIcon(item.icon)}</span>
              <span>{t(item.labelKey)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="rounded-[18px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">{plan === "pro" ? "Plan" : "Upgrade"}</p>
        <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-[var(--rb-fg)]">{promoTitle}</h3>
        <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{promoCopy}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <Link href="/pricing" className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={onNavigate}>
            {promoLabel}
          </Link>
          <LanguageSwitcher />
        </div>
      </div>

      <div className="mt-auto rounded-[18px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[rgba(255,255,255,0.06)] text-sm font-semibold text-[var(--rb-fg)]">
            {initials}
          </div>
          <div className="min-w-0">
            <strong className="block truncate text-sm font-medium text-[var(--rb-fg)]">{displayName}</strong>
            <span className="block truncate text-xs text-[var(--rb-muted)]">{isAuthenticated ? `${currentPlanLabel} 플랜` : t("nav.loginToSave")}</span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          {isAuthenticated ? (
            <form action={signOutAction}>
              <button type="submit" className={buttonStyles({ variant: "ghost", size: "sm" })}>
                {t("common.logout")}
              </button>
            </form>
          ) : (
            <Link href="/login" className={buttonStyles({ variant: "secondary", size: "sm" })} onClick={onNavigate}>
              {t("common.login")}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
