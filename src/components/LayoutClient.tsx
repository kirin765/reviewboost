"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { I18nProvider, useTranslation } from "@/lib/i18n";
import SidebarNav from "@/components/navigation/SidebarNav";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { planLabel, type PlanTier } from "@/lib/plan";

function TopBar({ planText }: { planText: string }) {
  const { t } = useTranslation();
  return (
    <header className="siteTopbar" aria-label={t("layout.pageTopSummary")}>
      <div>
        <p className="siteTopbarEyebrow">{t("layout.topbarEyebrow")}</p>
        <p className="siteTopbarTitle">{t("layout.topbarTitle")}</p>
      </div>
      <div className="siteTopbarMeta">
        <LanguageSwitcher />
        <span className="siteTopbarPill">{planText}</span>
        <a className="btn btnPrimary" href="/dashboard">
          {t("layout.startAnalysis")}
        </a>
      </div>
    </header>
  );
}

function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="siteFooterV2" aria-label={t("layout.siteInfo")}>
      <div className="footerSection">
        <h4>ReviewBoost</h4>
        <ul>
          <li><a href="/help">{t("footer.help")}</a></li>
          <li><a href="/pricing">{t("footer.pricing")}</a></li>
          <li><a href="/dashboard">{t("footer.analyze")}</a></li>
        </ul>
      </div>
      <div className="footerSection">
        <h4>{t("footer.legal")}</h4>
        <ul>
          <li><a href="/term">{t("footer.terms")}</a></li>
          <li><a href="/privacy">{t("footer.privacy")}</a></li>
        </ul>
      </div>
      <div className="footerSection">
        <h4>{t("footer.support")}</h4>
        <ul>
          <li><a href="mailto:support@reviewboost.co.kr">support@reviewboost.co.kr</a></li>
        </ul>
      </div>
    </footer>
  );
}

export default function LayoutClient({
  children,
  initialPlan = "free",
  initialUserEmail = null
}: {
  children: React.ReactNode;
  initialPlan?: PlanTier;
  initialUserEmail?: string | null;
}) {
  const pathname = usePathname();
  const [plan, setPlan] = useState<PlanTier>(initialPlan);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail);

  useEffect(() => {
    if (pathname.startsWith("/dashboard")) return;

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

  const planText = planLabel(plan);

  return (
    <I18nProvider>
      <div className="appShell">
        <aside className="leftNav appSidebar" aria-label="Main menu">
          <SidebarNav variant="app" plan={plan} userEmail={userEmail} />
        </aside>

        <div className="container appContainer">
          <TopBar planText={planText} />
          <div className="contentStage">{children}</div>
          <Footer />
        </div>
      </div>
    </I18nProvider>
  );
}
