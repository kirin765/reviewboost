"use client";

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { requestPasswordResetAction } from "@/app/(auth)/actions";
import AuthPendingSubmitButton from "@/components/Auth/AuthPendingSubmitButton";
import FeedbackModal from "@/components/FeedbackModal";
import AuthShell from "@/components/Auth/AuthShell";
import { buttonStyles } from "@/components/ui/Button";
import { useTranslation } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
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
    router.replace(`/forgot-password${next !== "/dashboard" ? `?next=${encodeURIComponent(next)}` : ""}`);
  }

  return (
    <>
      {err ? <FeedbackModal key={err} title={t("forgot.failTitle")} message={err} tone="error" onClose={handleErrorClose} /> : null}
      <AuthShell
        eyebrow={t("forgot.eyebrow")}
        title={t("forgot.shellTitle")}
        lead={t("forgot.shellLead")}
        bullets={[t("forgot.bullet1"), t("forgot.bullet2"), t("forgot.bullet3")]}
        note={t("forgot.note")}
      >
        <div className="authPanelHeader">
          <p className="sectionEyebrow">Recover</p>
          <h2>{t("forgot.panelTitle")}</h2>
          <p className="muted">{t("forgot.panelLead")}</p>
        </div>

        <form className="fieldRow" action={requestPasswordResetAction}>
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="muted formInputLabel" htmlFor="reset-request-email">{t("forgot.emailLabel")}</label>
            <input id="reset-request-email" className="input" name="email" type="email" placeholder="email@example.com" required />
          </div>
          <AuthPendingSubmitButton
            idleLabel={t("forgot.submit")}
            pendingLabel={t("forgot.submitting")}
            className={buttonStyles({ variant: "primary", className: "formSubmit w-full justify-center" })}
          />
        </form>

        <div className="authPanelFooter">
          <p className="muted formBottomNote">{t("forgot.otherRoutes")}</p>
          <div className="actionRow authActions">
            <a className={buttonStyles({ variant: "secondary" })} href={`/login?next=${encodeURIComponent(next)}`}>
              {t("forgot.goToLogin")}
            </a>
            <a className={buttonStyles({ variant: "ghost" })} href={`/signup?next=${encodeURIComponent(next)}`}>
              {t("common.signup")}
            </a>
          </div>
        </div>
      </AuthShell>
    </>
  );
}
