"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import FeedbackModal from "@/components/FeedbackModal";
import { useTranslation } from "@/lib/i18n";

export default function HomePage() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const sp = useMemo(() => {
    const obj: Record<string, string> = {};
    searchParams.forEach((v, k) => { obj[k] = v; });
    return obj;
  }, [searchParams]);

  const err = typeof sp.error === "string" ? sp.error : "";
  const errCode = typeof sp.error_code === "string" ? sp.error_code : "";
  const errDesc = typeof sp.error_description === "string" ? sp.error_description : "";
  const notice = typeof sp.notice === "string" ? sp.notice : "";

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

  const isErrorState = !!errorMessage;
  const steps = [t("home.step1"), t("home.step2"), t("home.step3"), t("home.step4")];
  const signalCards = [
    { label: t("home.signalInputFormat"), value: "CSV", meta: t("home.signalInputMeta") },
    { label: t("home.signalFlow"), value: "4 step", meta: t("home.signalFlowMeta") },
    { label: t("home.signalOutput"), value: "Report", meta: t("home.signalOutputMeta") },
    { label: t("home.signalShare"), value: "PDF", meta: t("home.signalShareMeta") }
  ];
  const featureCards = [
    {
      title: t("home.feature1Title"),
      body: t("home.feature1Body"),
      items: [t("home.feature1Item1"), t("home.feature1Item2"), t("home.feature1Item3")]
    },
    {
      title: t("home.feature2Title"),
      body: t("home.feature2Body"),
      items: [t("home.feature2Item1"), t("home.feature2Item2"), t("home.feature2Item3")]
    },
    {
      title: t("home.feature3Title"),
      body: t("home.feature3Body"),
      items: [t("home.feature3Item1"), t("home.feature3Item2"), t("home.feature3Item3")]
    }
  ];

  const stepDescs = [t("home.stepDesc1"), t("home.stepDesc2"), t("home.stepDesc3"), t("home.stepDesc4")];

  return (
    <main className="pageMain marketingPage">
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

      <section className="card marketingHero">
        <div className="marketingHeroCopy">
          <p className="eyebrow">{t("home.heroEyebrow")}</p>
          <h1 className="marketingTitle">{t("home.heroTitle")}</h1>
          <p className="marketingLead">{t("home.heroLead")}</p>
          <div className="actionRow actionRowLg">
            <a className="btn btnPrimary" href="/dashboard">
              {t("home.ctaAnalyze")}
            </a>
            <a className="btn btnGhost" href="/help">
              {t("home.ctaHelp")}
            </a>
            <a className="btn btnOutline" href="/sample.csv" download>
              {t("home.ctaSample")}
            </a>
          </div>
        </div>

        <div className="marketingHeroPanel" aria-label={t("home.dashboardSignal")}>
          <div className="marketingSignalGrid">
            {signalCards.map((card) => (
              <article className="marketingSignalCard" key={card.label}>
                <span className="marketingSignalLabel">{card.label}</span>
                <strong className="marketingSignalValue">{card.value}</strong>
                <span className="marketingSignalMeta">{card.meta}</span>
              </article>
            ))}
          </div>
          <div className="marketingPreviewCard">
            <div className="marketingPreviewHeader">
              <span className="marketingPreviewBadge">{t("home.previewBadge")}</span>
              <span className="marketingPreviewMuted">{t("home.previewMuted")}</span>
            </div>
            <div className="stepper marketingStepper" aria-label={t("home.entryGuide")}>
              {steps.map((step, index) => (
                <div className={`step ${index === 0 ? "active" : ""}`} key={step}>
                  <span className="stepNumber">{index + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="marketingTrustRow" aria-label="Trust points">
        <span className="trustItem">{t("home.trust1")}</span>
        <span className="trustItem">{t("home.trust2")}</span>
        <span className="trustItem">{t("home.trust3")}</span>
      </section>

      <section className="card marketingSection">
        <div className="marketingSectionIntro">
          <p className="sectionEyebrow">{t("home.coreOutcomes")}</p>
          <h2>{t("home.coreTitle")}</h2>
          <p className="muted">{t("home.coreLead")}</p>
        </div>
        <div className="marketingFeatureGrid">
          {featureCards.map((feature) => (
            <article className="marketingFeatureCard" key={feature.title}>
              <h3>{feature.title}</h3>
              <p className="muted">{feature.body}</p>
              <ul className="checklist marketingChecklist">
                {feature.items.map((item) => (
                  <li className="checkItem" key={item}>
                    <span className="checkBox" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="card marketingSection">
        <div className="marketingSectionIntro">
          <p className="sectionEyebrow">{t("home.howItStarts")}</p>
          <h2>{t("home.howTitle")}</h2>
          <p className="muted">{t("home.howLead")}</p>
        </div>
        <div className="marketingStepGrid">
          {steps.map((step, index) => (
            <article className="marketingStepCard" key={step}>
              <span className="marketingStepIndex">0{index + 1}</span>
              <h3>{step}</h3>
              <p className="muted">{stepDescs[index]}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">{t("home.startFree")}</p>
          <h2>{t("home.ctaTitle")}</h2>
          <p className="muted">{t("home.ctaLead")}</p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            {t("home.ctaStart")}
          </a>
          <a className="btn btnOutline" href="/sample.csv" download>
            {t("home.ctaSampleDownload")}
          </a>
        </div>
      </section>
    </main>
  );
}
