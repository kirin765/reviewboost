"use client";

import React from "react";
import type { AnalysisOutput } from "@/lib/types";
import PlanGate from "@/components/PlanGate";
import BlurGate from "@/components/BlurGate";
import { useTranslation } from "@/lib/i18n";

export { AnalysisResultsSummary } from "./analysis-results-summary";

type UrgentReview = NonNullable<AnalysisOutput["urgentReviews"]>[number];
type PriorityMatrix = NonNullable<AnalysisOutput["priorityMatrix"]>[number];
type ActionItem = NonNullable<AnalysisOutput["actionItems"]>[number];

export function UrgentReviewsSection({ result, gates }: { result: AnalysisOutput; gates: { urgentReviewVisibleCount: number } }) {
  const { t } = useTranslation();
  if (!result.urgentReviews || result.urgentReviews.length === 0) return null;

  return (
    <section className="card analysisResultsCard analysisResultsWide" id="urgent-section">
      <h2>{t("section.urgentTitle")}</h2>
      <p className="hint analysisResultsSubText">{t("section.urgentHint")}</p>
      <BlurGate visibleCount={gates.urgentReviewVisibleCount} totalCount={result.urgentReviews.length} featureName={t("results.urgentReviews")}>
        <div className="list">
          {result.urgentReviews.map((ur, idx) => {
            const rating = ur.review.rating;
            return (
              <article className="urgentReview" key={`${ur.review.text.slice(0, 20)}-${idx}`}>
                <div className="row urgentReviewMeta">
                  <div className="left">
                    <span
                      className={`badge ${rating === null || rating > 2 ? "badgeWarning" : "badgeDanger"}`}
                      aria-label={`${rating === null ? t("common.notProvided") : `${rating}${t("summary.points")}`}`}
                    >
                      {rating === null ? t("common.notProvided") : `${rating}${t("summary.points")}`}
                    </span>
                    <span className="badge urgentReviewCategory">{ur.review.category}</span>
                  </div>
                  <div className="right">{ur.daysSinceWritten === null ? t("common.noDate") : `${ur.daysSinceWritten}${t("section.daysAgo")}`}</div>
                </div>
                <div className="urgentText" aria-label="Highlighted text">
                  {ur.highlightedText || "-"}
                </div>
              </article>
            );
          })}
        </div>
      </BlurGate>
    </section>
  );
}

export function PriorityMatrixSection({ result, gates }: { result: AnalysisOutput; gates: { showPriorityActionSummary: boolean } }) {
  const { t } = useTranslation();
  if (!result.priorityMatrix || result.priorityMatrix.length === 0) return null;
  return (
    <section className="card analysisResultsCard" id="priority-section">
      <h2>{t("section.priorityTitle")}</h2>
      <p className="hint analysisResultsSectionHint">{t("section.priorityHint")}</p>
      <div className="priorityMatrix priorityMatrixSingleColumn">
        {result.priorityMatrix.map((pm: PriorityMatrix, idx) => (
          <div className={`quadrant ${pm.quadrant}`} key={idx}>
            <div className="quadrantTitle">
              {pm.category} ({pm.frequency}, {pm.frequencyPct}%)
            </div>
            <div className="quadrantImpact">{t("section.impact")} {pm.impact}/10</div>
            {gates.showPriorityActionSummary ? (
              <div className="quadrantAction">{pm.actionSummary}</div>
            ) : (
              <div className="quadrantActionBlurred">
                {pm.actionSummary}
                <div className="blurHint">{t("section.basicOrHigher")}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function RatingSimulationSection({ result }: { result: AnalysisOutput }) {
  const { t } = useTranslation();
  if (!result.ratingSimulation || result.ratingSimulation.scenarios.length === 0) return null;

  return (
    <PlanGate requiredPlan="pro" featureName={t("section.ratingSimTitle")}>
      <section className="card analysisResultsCard" id="simulation-section">
        <h2>{t("section.ratingSimTitle")}</h2>
        <p className="hint analysisResultsSectionHint">
          {t("section.ratingSimHint", { avg: result.ratingSimulation.currentAvg.toFixed(2) })}
        </p>
        <div className="simulationGrid simulationGridSingleColumn">
          {result.ratingSimulation.scenarios.map((sc, idx) => (
            <div className="simulationCard" key={idx}>
              <div className="simulationLabel">{sc.label}</div>
              <div className="simulationValue">{sc.newAvg.toFixed(2)}{t("summary.points")}</div>
              <div className={`simulationDelta ${sc.delta >= 0 ? "positive" : "negative"}`}>
                {sc.delta >= 0 ? "+" : ""}
                {sc.delta.toFixed(2)}{t("summary.points")}
                <span className="simulationResolvedCount">
                  ({sc.resolvedCount}{t("section.resolved")})
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </PlanGate>
  );
}

export function PositiveKeywordsSection({ result }: { result: AnalysisOutput }) {
  const { t } = useTranslation();
  if (!result.positiveKeywords || result.positiveKeywords.length === 0) return null;

  return (
    <PlanGate requiredPlan="pro" featureName={t("section.positiveTitle")}>
      <section className="card analysisResultsCard" id="positive-section">
        <h2>{t("section.positiveTitle")}</h2>
        <div className="list">
          {result.positiveKeywords.map((k) => (
            <div className="row" key={k.keyword}>
              <div className="left">{k.keyword}</div>
              <div className="right">{k.count}</div>
            </div>
          ))}
        </div>
      </section>
    </PlanGate>
  );
}

export function ActionItemsSection({ result, gates }: { result: AnalysisOutput; gates: { actionItemVisibleCount: number } }) {
  const { t } = useTranslation();
  if (!result.actionItems || result.actionItems.length === 0) return null;

  return (
    <section className="card analysisResultsCard analysisResultsWide" id="action-section">
      <h2>{t("section.actionItemsTitle")}</h2>
      <BlurGate visibleCount={gates.actionItemVisibleCount} totalCount={result.actionItems.length} featureName={t("results.actionItems")}>
        <div>
          {result.actionItems.map((item: ActionItem) => (
            <div className={`actionItem impact${item.impact.charAt(0).toUpperCase() + item.impact.slice(1)}`} key={item.id}>
              <div className="actionItemBody">
                <div className="actionItemBadges">
                  <span
                    className={`badge ${
                      item.impact === "high" ? "badgeDanger" : item.impact === "medium" ? "badgeWarning" : "badgeSuccess"
                    }`}
                  >
                    {item.impact === "high" ? t("section.impactHigh") : item.impact === "medium" ? t("section.impactMedium") : t("section.impactLow")}
                  </span>
                  <span className="badge badgePrimary">
                    {item.category === "detailPage" ? t("section.catDetailPage") : item.category === "csResponse" ? t("section.catCsResponse") : t("section.catFaq")}
                  </span>
                </div>
                <div className="actionItemText">{item.action}</div>
                {item.relatedKeyword ? <div className="actionItemKeyword">{t("section.relatedKeyword")} {item.relatedKeyword}</div> : null}
              </div>
              <div className="actionItemCount">{item.reviewCount}</div>
            </div>
          ))}
        </div>
      </BlurGate>
    </section>
  );
}
