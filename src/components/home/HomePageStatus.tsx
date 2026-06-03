"use client";

import { useSearchParams } from "next/navigation";
import FeedbackModal from "@/components/FeedbackModal";
import { useTranslation } from "@/lib/i18n";

export default function HomePageStatus() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const err = searchParams.get("error") ?? "";
  const errCode = searchParams.get("error_code") ?? "";
  const errDesc = searchParams.get("error_description") ?? "";
  const notice = searchParams.get("notice") ?? "";

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
