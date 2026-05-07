"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signUpAction } from "@/app/(auth)/actions";
import AuthPendingSubmitButton from "@/components/Auth/AuthPendingSubmitButton";
import FeedbackModal from "@/components/FeedbackModal";
import AuthShell from "@/components/Auth/AuthShell";
import { buttonStyles } from "@/components/ui/Button";
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

        <div style={{ padding: "12px 16px", background: "rgba(234,179,8,0.12)", border: "1px solid rgba(234,179,8,0.4)", borderRadius: "8px", color: "var(--rb-fg)", fontSize: "0.875rem", lineHeight: "1.5" }}>
          <strong>회원가입이 일시적으로 중단되었습니다.</strong><br />
          현재 서비스 준비 중으로 신규 가입을 받지 않고 있습니다. 준비가 완료되는 대로 안내드리겠습니다.
        </div>

        <form className="fieldRow" action={signUpAction} style={{ opacity: 0.4, pointerEvents: "none" }}>
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
          <AuthPendingSubmitButton
            idleLabel={t("signup.submit")}
            pendingLabel={t("signup.submitting")}
            className={buttonStyles({ variant: "primary", className: "formSubmit w-full justify-center" })}
          />
        </form>

        <div className="authPanelFooter">
          <p className="muted formBottomNote">{t("signup.hasAccount")}</p>
          <div className="actionRow authActions">
            <a className={buttonStyles({ variant: "secondary" })} href={`/login?next=${encodeURIComponent(next)}`}>
              {t("common.login")}
            </a>
            <a
              className={buttonStyles({
                variant: "ghost",
                className: "border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.04)] text-[var(--rb-fg)] hover:bg-[rgba(255,255,255,0.08)]"
              })}
              href="/dashboard/analyze"
            >
              {t("common.goToAnalysis")}
            </a>
          </div>
        </div>
      </AuthShell>
    </>
  );
}
