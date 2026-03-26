"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import FeedbackModal from "@/components/FeedbackModal";
import { useTranslation } from "@/lib/i18n";

export default function HomePageStatus() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const code = searchParams.get("code") ?? "";
  const tokenHash = searchParams.get("token_hash") ?? "";
  const type = searchParams.get("type") ?? "";
  const err = searchParams.get("error") ?? "";
  const errCode = searchParams.get("error_code") ?? "";
  const errDesc = searchParams.get("error_description") ?? "";
  const notice = searchParams.get("notice") ?? "";
  const needsLegacyAuthRedirect = Boolean(code || (tokenHash && type));

  useEffect(() => {
    if (!needsLegacyAuthRedirect || typeof window === "undefined") return;

    const url = new URL(window.location.href);
    url.pathname = code ? "/auth/callback" : "/auth/confirm";
    window.location.replace(url.toString());
  }, [code, needsLegacyAuthRedirect]);

  if (needsLegacyAuthRedirect) {
    return (
      <div className="card errorCard">
        <h2 className="errorTitle">{t("common.notice")}</h2>
        <p className="errorMessage">인증을 처리하는 중입니다...</p>
      </div>
    );
  }

  let errorMessage = err;
  let showResendOption = false;

  if (errCode === "otp_expired" || errDesc.includes("expired")) {
    errorMessage = t("home.otpExpired");
    showResendOption = true;
  } else if (errCode === "access_denied") {
    errorMessage = t("home.accessDenied");
    showResendOption = true;
  } else if (errDesc) {
    errorMessage = errDesc.replace(/\+/g, " ");
  }

  const isErrorState = Boolean(errorMessage);

  return (
    <>
      {isErrorState ? (
        <div className="card errorCard">
          <h2 className="errorTitle">{t("home.errorTitle")}</h2>
          <p className="errorMessage">{errorMessage}</p>
          {showResendOption ? (
            <div className="actionRow">
              <a className="btn btnPrimary" href="/signup">
                {t("home.resendSignup")}
              </a>
              <a className="btn" href="/help">
                {t("home.viewHelp")}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
      {!isErrorState && notice ? <FeedbackModal title={t("common.notice")} message={notice} /> : null}
    </>
  );
}
