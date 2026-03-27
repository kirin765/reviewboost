"use client";

import React from "react";
import Script from "next/script";
import PricingActions from "@/components/PricingActions";
import { useTranslation } from "@/lib/i18n";

interface PricingContentProps {
  userId: string | null;
  userEmail: string | null;
  basicPriceId: string | undefined;
  proPriceId: string | undefined;
  billing: string | undefined;
}

export default function PricingContent({ userId, userEmail, basicPriceId, proPriceId, billing }: PricingContentProps) {
  const { t } = useTranslation();

  const pricingStats = [
    { label: t("pricing.freeLabel"), value: t("pricing.freeValue"), meta: t("pricing.freeMeta") },
    { label: "Basic", value: t("pricing.basicValue"), meta: t("pricing.basicMeta") },
    { label: "Pro", value: t("pricing.proValue"), meta: t("pricing.proMeta") }
  ];

  return (
    <main className="pageMain pricingPage">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" />

      <section className="card pricingHero">
        <div className="pricingHeroHeader">
          <div>
            <p className="sectionEyebrow">Pricing</p>
            <h1>{t("pricing.title")}</h1>
            <p className="muted pricingHeroLead">{t("pricing.lead")}</p>
          </div>
          <div className="pricingHeroMeta">
            <span className="pill pillActive">{t("pricing.safePayment")}</span>
            <span className="pill">{t("pricing.storageIntegration")}</span>
            <span className="pill pillBeta">🎉 {t("pricing.betaPill")}</span>
          </div>
        </div>

        <div className="pricingHeroStats">
          {pricingStats.map((item) => (
            <article className="pricingHeroStat" key={item.label}>
              <span className="pricingHeroStatLabel">{item.label}</span>
              <strong className="pricingHeroStatValue">{item.value}</strong>
              <span className="pricingHeroStatMeta">{item.meta}</span>
            </article>
          ))}
        </div>

        {billing === "success" ? <p className="hint pricingBillingNotice">{t("pricing.billingSuccess")}</p> : null}
        {billing === "cancel" ? <p className="hint pricingBillingNotice">{t("pricing.billingCancel")}</p> : null}
      </section>

      <div className="pricingCardGrid">
        <article className="card pricingCard">
          <header className="pricingCardHeader">
            <div>
              <p className="pricingPlanLabel">{t("pricing.starterLabel")}</p>
              <h2>{t("pricing.starterTitle")}</h2>
            </div>
            <p className="pricingValue">₩0</p>
            <p className="muted pricingPlanMeta">{t("pricing.starterMeta")}</p>
          </header>
          <div className="pricingCardBody">
            <div className="list">
              <div className="row"><div className="left">{t("pricing.csvUpload")}</div><div className="right">{t("pricing.perMonth5")}</div></div>
              <div className="row"><div className="left">{t("pricing.reviewsPerAnalysis")}</div><div className="right">{t("pricing.max50")}</div></div>
              <div className="row"><div className="left">{t("pricing.pdfReport")}</div><div className="right">{t("pricing.withWatermark")}</div></div>
              <div className="row"><div className="left">{t("pricing.savedHistory")}</div><div className="right">{t("pricing.recent3")}</div></div>
              <div className="row"><div className="left">{t("pricing.negKeywords")}</div><div className="right">TOP 5</div></div>
              <div className="row"><div className="left">{t("pricing.urgentReviews")}</div><div className="right">TOP 3</div></div>
              <div className="row"><div className="left">{t("pricing.priorityMatrix")}</div><div className="right">{t("pricing.summaryOnly")}</div></div>
              <div className="row"><div className="left">{t("pricing.analysisPrecision")}</div><div className="right">{t("pricing.basicAnalysis")}</div></div>
            </div>
          </div>
          <footer className="pricingCardFooter" />
        </article>

        <article className="card pricingCard pricingCardPopular">
          <header className="pricingCardHeader">
            <div className="pricingCardHeaderRow">
              <div>
                <p className="pricingPlanLabel">{t("pricing.basicLabel")}</p>
                <h2>{t("pricing.basicTitle")}</h2>
              </div>
              <div className="pricingBadgeGroup">
                <span className="badge badgePrimary pricingBadge">{t("pricing.basicBadge")}</span>
                <span className="badge pricingBetaBadge">{t("pricing.betaBadge")}</span>
              </div>
            </div>
            <div className="pricingValueGroup">
              <span className="pricingValueOriginal">₩39,000</span>
              <p className="pricingValue">₩19,000</p>
            </div>
            <p className="muted pricingPlanMeta">{t("pricing.basicPlanMeta")}</p>
          </header>
          <div className="pricingCardBody">
            <div className="list">
              <div className="row"><div className="left">{t("pricing.analysisCount")}</div><div className="right">{t("pricing.perMonth200")}</div></div>
              <div className="row"><div className="left">{t("pricing.reviewsPerAnalysis")}</div><div className="right">{t("pricing.max500")}</div></div>
              <div className="row"><div className="left">{t("pricing.pdfReport")}</div><div className="right">{t("pricing.noWatermark")}</div></div>
              <div className="row"><div className="left">{t("pricing.savedHistory")}</div><div className="right">{t("pricing.max500History")}</div></div>
              <div className="row"><div className="left">{t("pricing.negKeywords")}</div><div className="right">TOP 10</div></div>
              <div className="row"><div className="left">{t("pricing.urgentReviews")}</div><div className="right">TOP 10</div></div>
              <div className="row"><div className="left">{t("pricing.priorityMatrix")}</div><div className="right">{t("pricing.detailedSummary")}</div></div>
              <div className="row"><div className="left">{t("pricing.analysisPrecision")}</div><div className="right">{t("pricing.preciseAnalysis")}</div></div>
              <div className="row"><div className="left">{t("pricing.shareLink")}</div><div className="right">{t("pricing.available")}</div></div>
              <div className="row"><div className="left">{t("pricing.supportLabel")}</div><div className="right">{t("pricing.priorityEmail")}</div></div>
            </div>
          </div>
          <footer className="pricingCardFooter">
            <div className="pricingCardActionRow">
              <PricingActions plan="basic" priceId={basicPriceId} userId={userId ?? undefined} userEmail={userEmail ?? undefined} />
            </div>
          </footer>
        </article>

        <article className="card pricingCard">
          <header className="pricingCardHeader">
            <div className="pricingCardHeaderRow">
              <div>
                <p className="pricingPlanLabel">{t("pricing.proLabel")}</p>
                <h2>{t("pricing.proTitle")}</h2>
              </div>
              <span className="badge pricingBetaBadge">{t("pricing.betaBadge")}</span>
            </div>
            <div className="pricingValueGroup">
              <span className="pricingValueOriginal">₩89,000</span>
              <p className="pricingValue">₩45,000</p>
            </div>
            <p className="muted pricingPlanMeta">{t("pricing.proPlanMeta")}</p>
          </header>
          <div className="pricingCardBody">
            <div className="list">
              <div className="row"><div className="left">{t("pricing.analysisCount")}</div><div className="right">{t("pricing.perMonth1000")}</div></div>
              <div className="row"><div className="left">{t("pricing.reviewsPerAnalysis")}</div><div className="right">{t("pricing.max2000")}</div></div>
              <div className="row"><div className="left">{t("pricing.pdfReport")}</div><div className="right">{t("pricing.noWatermarkBrand")}</div></div>
              <div className="row"><div className="left">{t("pricing.savedHistory")}</div><div className="right">{t("pricing.max1500History")}</div></div>
              <div className="row"><div className="left">{t("pricing.negKeywords")}</div><div className="right">TOP 10</div></div>
              <div className="row"><div className="left">{t("pricing.urgentReviews")}</div><div className="right">TOP 10</div></div>
              <div className="row"><div className="left">{t("pricing.priorityMatrix")}</div><div className="right">{t("pricing.detailedSummary")}</div></div>
              <div className="row"><div className="left">{t("pricing.ratingSim")}</div><div className="right">{t("pricing.available")}</div></div>
              <div className="row"><div className="left">{t("pricing.positiveKeywords")}</div><div className="right">{t("pricing.available")}</div></div>
              <div className="row"><div className="left">{t("pricing.actionChecklist")}</div><div className="right">{t("pricing.allActions")}</div></div>
              <div className="row"><div className="left">{t("pricing.analysisPrecision")}</div><div className="right">{t("pricing.highestPrecision")}</div></div>
              <div className="row"><div className="left">{t("pricing.teamSeats")}</div><div className="right">{t("pricing.max5")}</div></div>
              <div className="row"><div className="left">{t("pricing.teamSharing")}</div><div className="right">{t("pricing.teamSharingIncluded")}</div></div>
              <div className="row"><div className="left">{t("pricing.supportLabel")}</div><div className="right">{t("pricing.topSupport")}</div></div>
            </div>
          </div>
          <footer className="pricingCardFooter">
            <div className="pricingCardActionRow">
              <PricingActions plan="pro" priceId={proPriceId} userId={userId ?? undefined} userEmail={userEmail ?? undefined} />
            </div>
          </footer>
        </article>
      </div>

      <section className="card pricingNoteCard">
        <div>
          <p className="sectionEyebrow">Note</p>
          <h2>{t("pricing.noteTitle")}</h2>
          <p className="muted">{t("pricing.noteLead")}</p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            {t("pricing.analyzeNow")}
          </a>
        </div>
      </section>
    </main>
  );
}
