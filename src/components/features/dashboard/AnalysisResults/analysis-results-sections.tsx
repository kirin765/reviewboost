import type { AnalysisOutput } from "@/lib/types";
import PlanGate from "@/components/PlanGate";
import BlurGate from "@/components/BlurGate";

type UrgentReview = NonNullable<AnalysisOutput["urgentReviews"]>[number];
type PriorityMatrix = NonNullable<AnalysisOutput["priorityMatrix"]>[number];
type ActionItem = NonNullable<AnalysisOutput["actionItems"]>[number];

export function UrgentReviewsSection({ result, gates }: { result: AnalysisOutput; gates: { urgentReviewVisibleCount: number } }) {
  if (!result.urgentReviews || result.urgentReviews.length === 0) return null;

  return (
    <section className="card analysisResultsCard analysisResultsWide" id="urgent-section">
      <h2>긴급 대응 필요 리뷰</h2>
      <p className="hint analysisResultsSubText">별점 1~2점 + 부정 감정 리뷰 중 최근 7일 이내 또는 우선 순위 10건</p>
      <BlurGate visibleCount={gates.urgentReviewVisibleCount} totalCount={result.urgentReviews.length} featureName="긴급 대응">
        <div className="list">
          {result.urgentReviews.map((ur, idx) => {
            const rating = ur.review.rating;
            return (
              <article className="urgentReview" key={`${ur.review.text.slice(0, 20)}-${idx}`}>
                <div className="row urgentReviewMeta">
                  <div className="left">
                    <span
                      className={`badge ${rating === null || rating > 2 ? "badgeWarning" : "badgeDanger"}`}
                      aria-label={`리뷰 평점 ${rating === null ? "미기재" : `${rating}점`}`}
                    >
                      {rating === null ? "미기재" : `${rating}점`}
                    </span>
                    <span className="badge urgentReviewCategory">{ur.review.category}</span>
                  </div>
                  <div className="right">{ur.daysSinceWritten === null ? "날짜 없음" : `${ur.daysSinceWritten}일 전`}</div>
                </div>
                <div className="urgentText" aria-label="강조 텍스트">
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
  if (!result.priorityMatrix || result.priorityMatrix.length === 0) return null;
  return (
    <section className="card analysisResultsCard" id="priority-section">
      <h2>우선순위 매트릭스</h2>
      <p className="hint analysisResultsSectionHint">
        카테고리별 빈도와 영향도로 개선 우선순위를 분류합니다.
      </p>
      <div className="priorityMatrix">
        {result.priorityMatrix.map((pm: PriorityMatrix, idx) => (
          <div className={`quadrant ${pm.quadrant}`} key={idx}>
            <div className="quadrantTitle">
              {pm.category} ({pm.frequency}건, {pm.frequencyPct}%)
            </div>
            <div className="quadrantImpact">영향도: {pm.impact}/10</div>
            {gates.showPriorityActionSummary ? (
              <div className="quadrantAction">{pm.actionSummary}</div>
            ) : (
              <div className="quadrantActionBlurred">
                {pm.actionSummary}
                <div className="blurHint">Basic 이상</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function RatingSimulationSection({ result }: { result: AnalysisOutput }) {
  if (!result.ratingSimulation || result.ratingSimulation.scenarios.length === 0) return null;

  return (
    <PlanGate requiredPlan="pro" featureName="별점 시뮬레이션">
      <section className="card analysisResultsCard" id="simulation-section">
        <h2>별점 시뮬레이션</h2>
        <p className="hint analysisResultsSectionHint">
          부정 리뷰 해결 시 예상되는 평균 별점 변화 (현재: {result.ratingSimulation.currentAvg.toFixed(2)}점)
        </p>
        <div className="simulationGrid">
          {result.ratingSimulation.scenarios.map((sc, idx) => (
            <div className="simulationCard" key={idx}>
              <div className="simulationLabel">{sc.label}</div>
              <div className="simulationValue">{sc.newAvg.toFixed(2)}점</div>
              <div className={`simulationDelta ${sc.delta >= 0 ? "positive" : "negative"}`}>
                {sc.delta >= 0 ? "+" : ""}
                {sc.delta.toFixed(2)}점
                <span className="simulationResolvedCount">
                  ({sc.resolvedCount}건 해결)
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
  if (!result.positiveKeywords || result.positiveKeywords.length === 0) return null;

  return (
    <PlanGate requiredPlan="pro" featureName="긍정 키워드">
      <section className="card analysisResultsCard" id="positive-section">
        <h2>긍정 키워드</h2>
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
  if (!result.actionItems || result.actionItems.length === 0) return null;

  return (
    <section className="card analysisResultsCard analysisResultsWide" id="action-section">
      <h2>개선 액션 아이템</h2>
      <BlurGate visibleCount={gates.actionItemVisibleCount} totalCount={result.actionItems.length} featureName="개선 액션">
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
                    {item.impact === "high" ? "높음" : item.impact === "medium" ? "중간" : "낮음"}
                  </span>
                  <span className="badge badgePrimary">
                    {item.category === "detailPage" ? "상세페이지" : item.category === "csResponse" ? "CS응대" : "FAQ"}
                  </span>
                </div>
                <div className="actionItemText">{item.action}</div>
                {item.relatedKeyword ? <div className="actionItemKeyword">관련 키워드: {item.relatedKeyword}</div> : null}
              </div>
              <div className="actionItemCount">{item.reviewCount}</div>
            </div>
          ))}
        </div>
      </BlurGate>
    </section>
  );
}
