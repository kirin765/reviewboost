"use client";

import React, { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction } from "@/app/(auth)/actions";
import FeedbackModal from "@/components/FeedbackModal";
import AuthShell from "@/components/Auth/AuthShell";
import { useTranslation } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const err = useMemo(() => {
    const value = searchParams.get("error");
    return typeof value === "string" ? value : "";
  }, [searchParams]);

  const notice = useMemo(() => {
    const value = searchParams.get("notice");
    return typeof value === "string" ? value : "";
  }, [searchParams]);

  const next = useMemo(() => {
    const value = searchParams.get("next");
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }, [searchParams]);

  function handleErrorClose() {
    router.replace(`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  function handleNoticeClose() {
    router.replace(`/login${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <>
      {err ? <FeedbackModal key={err} title={t("login.failTitle")} message={err} tone="error" onClose={handleErrorClose} /> : null}
      {!err && notice ? <FeedbackModal key={notice} title={t("common.notice")} message={notice} onClose={handleNoticeClose} /> : null}
      <AuthShell
        eyebrow={t("login.eyebrow")}
        title={t("login.shellTitle")}
        lead={t("login.shellLead")}
        bullets={[t("login.bullet1"), t("login.bullet2"), t("login.bullet3")]}
        note={t("login.note")}
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">로그인</p>
          <h2>{t("login.panelTitle")}</h2>
          <p className="muted">{t("login.panelLead")}</p>
        </div>

        <form className="fieldRow" action={signInAction}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="muted formInputLabel" htmlFor="login-email">{t("login.emailLabel")}</label>
            <input id="login-email" className="input" name="email" type="email" placeholder="email@example.com" required />
          </div>
          <div>
            <label className="muted formInputLabel" htmlFor="login-password">{t("login.passwordLabel")}</label>
            <input id="login-password" className="input" name="password" type="password" placeholder={t("login.passwordPlaceholder")} required />
          </div>
          <button className="btn btnPrimary formSubmit" type="submit">
            {t("login.submit")}
          </button>
          <div className="formHintRow">
            <a className="link formNote" href={`/forgot-password?next=${encodeURIComponent(next)}`}>
              {t("login.forgotPassword")}
            </a>
          </div>
        </form>

        <div className="authPanelFooter">
          <p className="muted formBottomNote">{t("login.noAccount")}</p>
          <div className="actionRow authActions">
            <a className="btn" href={`/signup?next=${encodeURIComponent(next)}`}>
              {t("common.signup")}
            </a>
            <a className="btn btnOutline" href="/dashboard/analyze">
              {t("common.goToAnalysis")}
            </a>
          </div>
        </div>
      </AuthShell>
    </>
  );
}
