"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpAction } from "@/app/(auth)/actions";
import AuthPendingSubmitButton from "@/components/Auth/AuthPendingSubmitButton";
import FeedbackModal from "@/components/FeedbackModal";
import AuthShell from "@/components/Auth/AuthShell";
import { useTranslation } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const err = useMemo(() => {
    const value = searchParams.get("error");
    return typeof value === "string" ? value : "";
  }, [searchParams]);

  const next = useMemo(() => {
    const value = searchParams.get("next");
    return typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
  }, [searchParams]);

  function handleErrorClose() {
    router.replace(`/signup${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <>
      {err ? <FeedbackModal key={err} title={t("signup.failTitle")} message={err} tone="error" onClose={handleErrorClose} /> : null}
      <AuthShell
        eyebrow={t("signup.eyebrow")}
        title={t("signup.shellTitle")}
        lead={t("signup.shellLead")}
        bullets={[t("login.bullet1"), t("login.bullet2"), t("login.bullet3")]}
        note={t("login.note")}
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">Sign up</p>
          <h2>{t("signup.panelTitle")}</h2>
          <p className="muted">{t("signup.panelLead")}</p>
        </div>

        <form className="fieldRow" action={signUpAction}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="muted formInputLabel" htmlFor="signup-email">{t("signup.emailLabel")}</label>
            <input id="signup-email" className="input" name="email" type="email" placeholder="email@example.com" required />
          </div>
          <div>
            <label className="muted formInputLabel" htmlFor="signup-password">{t("signup.passwordLabel")}</label>
            <input
              id="signup-password"
              className="input"
              name="password"
              type="password"
              placeholder={t("signup.passwordPlaceholder")}
              minLength={6}
              required
            />
          </div>
          <label className="consentRow">
            <input type="checkbox" name="agreeTerms" value="yes" required />
            <span>
              {t("signup.agreeTerms")} <a className="link formNote" href="/terms" target="_blank" rel="noreferrer">{t("signup.agreeTermsLink")}</a>
            </span>
          </label>
          <label className="consentRow">
            <input type="checkbox" name="agreePrivacy" value="yes" required />
            <span>
              {t("signup.agreePrivacy")} <a className="link formNote" href="/privacy" target="_blank" rel="noreferrer">{t("signup.agreeTermsLink")}</a>
            </span>
          </label>
          <div className="consentSummary">
            {t("signup.consentSummary")}
          </div>
          <label className="consentRow optional">
            <input type="checkbox" name="agreeMarketing" value="yes" />
            <span>{t("signup.agreeMarketing")}</span>
          </label>
          <AuthPendingSubmitButton idleLabel={t("signup.submit")} pendingLabel={t("signup.submitting")} />
        </form>

        <div className="authPanelFooter">
          <p className="muted formBottomNote">{t("signup.hasAccount")}</p>
          <div className="actionRow authActions">
            <a className="btn" href={`/login?next=${encodeURIComponent(next)}`}>
              {t("common.login")}
            </a>
            <a className="btn btnOutline" href="/dashboard">
              {t("common.goToAnalysis")}
            </a>
          </div>
        </div>
      </AuthShell>
    </>
  );
}
