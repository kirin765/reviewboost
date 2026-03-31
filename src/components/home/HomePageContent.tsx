"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n";

export default function HomePageContent() {
  const { t } = useTranslation();

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
  const resourceCards = [
    {
      href: "/features",
      title: "핵심 기능 보기",
      body: "AI 리뷰 분석, CSV 추출, 부정리뷰 대응, FAQ 생성 흐름을 한 번에 확인합니다."
    },
    {
      href: "/help",
      title: "사용법 빠르게 읽기",
      body: "CSV 준비부터 쿠팡·스마트스토어 리뷰 추출, FAQ 운영까지 단계별 가이드를 확인합니다."
    },
    {
      href: "/blog",
      title: "실전 운영 사례 읽기",
      body: "부정리뷰 대응, 별점 관리, 매출 개선 전략을 블로그 글로 살펴볼 수 있습니다."
    }
  ];

  return (
    <>
      <section className="card marketingHero">
        <div className="marketingHeroCopy">
          <p className="eyebrow">{t("home.heroEyebrow")}</p>
          <h1 className="marketingTitle">{t("home.heroTitle")}</h1>
          <p className="marketingLead">{t("home.heroLead")}</p>
          <div className="actionRow actionRowLg">
            <a className="btn btnPrimary" href="/dashboard">
              {t("home.ctaAnalyze")}
            </a>
            <a className="btn btnOutline" href="/sample.csv" download>
              {t("home.ctaSample")}
            </a>
          </div>
        </div>

        <div className="marketingHeroPanel" aria-label={t("home.dashboardSignal")}>
          <div className="marketingSignalGrid" style={{ gridColumn: "1 / -1" }}>
            {signalCards.map((card) => (
              <article className="marketingSignalCard" key={card.label}>
                <span className="marketingSignalLabel">{card.label}</span>
                <strong className="marketingSignalValue">{card.value}</strong>
                <span className="marketingSignalMeta">{card.meta}</span>
              </article>
            ))}
          </div>
          <div className="marketingPreviewCard" style={{ gridColumn: "1 / -1" }}>
            <div className="marketingPreviewHeader">
              <span className="marketingPreviewBadge">{t("home.previewBadge")}</span>
              <span className="marketingPreviewMuted">{t("home.previewMuted")}</span>
            </div>
            <div
              className="stepper marketingStepper"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}
              aria-label={t("home.entryGuide")}
            >
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

      <section className="card marketingSection">
        <div className="marketingSectionIntro">
          <p className="sectionEyebrow">Explore</p>
          <h2>검색과 탐색에 맞춘 주요 허브</h2>
          <p className="muted">기능 소개, 사용 가이드, 실전 운영 글을 각각 허브 형태로 정리했습니다.</p>
        </div>
        <div className="marketingFeatureGrid">
          {resourceCards.map((card) => (
            <a className="marketingFeatureCard blogCardLink" href={card.href} key={card.href}>
              <h3>{card.title}</h3>
              <p className="muted">{card.body}</p>
            </a>
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
    </>
  );
}
