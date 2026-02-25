"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalysisOutput } from "@/lib/types";
import type { Capabilities } from "@/lib/capabilities";
import { useGates } from "@/contexts/PlanContext";
import PlanGate from "@/components/PlanGate";
import BlurGate from "@/components/BlurGate";
import AnalysisResultDigest from "@/components/Analysis/AnalysisResultDigest";

interface AnalysisResultsProps {
  result: AnalysisOutput & {
    meta: {
      filename: string | null;
      stored: boolean;
      analysisId?: string;
      truncated?: boolean;
    };
  };
  caps: Capabilities | null;
  busy: boolean;
  onDownloadPdf: () => void;
}

export default function AnalysisResults({ result, caps, busy, onDownloadPdf }: AnalysisResultsProps) {
  const gates = useGates();
  const summaryCardRef = useRef<HTMLDivElement>(null);
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);
  useEffect(() => {
    if (!result || !summaryCardRef.current) return;
    summaryCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setAnalysisDoneNotice("분석이 완료되었습니다. 핵심 지표로 이동했습니다.");
  }, [result]);

  return (
    <>
      {analysisDoneNotice ? (
        <div className="analysisNoticeCard">
          <p className="analysisNoticeCardText">{analysisDoneNotice}</p>
        </div>
      ) : null}

      <div className="analysisResultsSection" ref={summaryCardRef}>
        <AnalysisResultDigest result={result} />
        {result.meta.truncated ? (
          <p className="hint danger analysisResultsWarning">
            리뷰 수가 플랜 한도를 초과하여 {gates.maxReviewsPerAnalysis}개만 분석되었습니다. 전체 분석은 Basic 이상으로 업그레이드 후 이용하세요.
          </p>
        ) : null}
        {!result?.stats?.recentness?.hasDates ? (
          <p className="hint muted analysisResultsHintMuted">작성일 열이 없으면 &ldquo;최근 이슈&rdquo;는 계산되지 않거나 약하게만 반영됩니다.</p>
        ) : null}
        <div className="toolbar">
          <button className="btn" onClick={onDownloadPdf} disabled={!result || busy}>
            PDF 다운로드
          </button>
        </div>
      </div>

      <div className="kpiMetaTags" aria-label="분류 지표 요약">
        <span className="pill">긍정 {Math.round(result.stats.positiveRatio * 100)}%</span>
        <span className="pill">중립 {Math.round((result.stats.neutral / result.stats.total) * 100)}%</span>
        <span className="pill">평균 별점 {result.stats.avgRating === null ? "-" : result.stats.avgRating.toFixed(2)}</span>
      </div>

      {result.urgentReviews && result.urgentReviews.length > 0 ? (
      <div className="grid" style={{ marginTop: 16 }}>
          <div className="card">
            <h2>긴급 대응 필요 리뷰</h2>
            <p className="hint analysisResultsSubText">
              별점 1~2점 + 부정 감정 리뷰 중 최근 7일 이내 또는 저별점 우선 10건
            </p>
            <BlurGate
              visibleCount={gates.urgentReviewVisibleCount}
              totalCount={result.urgentReviews.length}
              featureName="긴급 대응"
            >
            <div className="list">
                {result.urgentReviews.map((ur, idx) => {
                  const rating = ur.review.rating;
                  return (
                  <div className="urgentReview" key={`${ur.review.text.slice(0, 20)}-${idx}`}>
                    <div className="row urgentReviewMeta">
                      <div className="left">
                        <span
                          className={`badge ${rating === null || rating > 2 ? "badgeWarning" : "badgeDanger"}`}
                          aria-label={`리뷰 평점 ${rating === null ? "미기재" : `${rating}점`}`}
                        >
                          {rating === null ? "미기재" : `${rating}점`}
                        </span>
                        <span className="badge urgentReviewCategory">
                          {ur.review.category}
                        </span>
                      </div>
                      <div className="right">{ur.daysSinceWritten === null ? "날짜 없음" : `${ur.daysSinceWritten}일 전`}</div>
                    </div>
                    <div className="urgentText" aria-label="강조 텍스트">
                      {ur.highlightedText || "-"}
                    </div>
                  </div>
                  );
                })}
              </div>
            </BlurGate>
          </div>
        </div>
      ) : null}

      {result.priorityMatrix && result.priorityMatrix.length > 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>우선순위 매트릭스</h2>
          <p className="hint" style={{ marginTop: -4, marginBottom: 16 }}>
            카테고리별 빈도(발생빈도)와 영향도(비즈니스 영향)를 기반으로 개선 우선순위를 분류합니다.
          </p>
          <div className="priorityMatrix">
            {result.priorityMatrix.map((pm, idx) => (
              <div className={`quadrant ${pm.quadrant}`} key={idx}>
                <div className="quadrantTitle">
                  {pm.category} ({pm.frequency}건, {pm.frequencyPct}%)
                </div>
                <div style={{ fontSize: 13, color: "var(--color-muted)" }}>영향도: {pm.impact}/10</div>
                {gates.showPriorityActionSummary ? (
                  <div style={{ fontSize: 12, marginTop: 6, color: "#555" }}>{pm.actionSummary}</div>
                ) : (
                  <div style={{ fontSize: 12, marginTop: 6, color: "#555", filter: "blur(4px)", opacity: 0.5, userSelect: "none" }}>
                    {pm.actionSummary}
                    <div className="blurHint">Basic 이상</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <PlanGate requiredPlan="pro" featureName="별점 시뮬레이션">
        {result.ratingSimulation && result.ratingSimulation.scenarios.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h2>별점 시뮬레이션</h2>
            <p className="hint" style={{ marginTop: -4, marginBottom: 16 }}>
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
                    <span style={{ fontSize: 12, color: "var(--color-muted)", marginLeft: 6 }}>
                      ({sc.resolvedCount}건 해결)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PlanGate>

      <PlanGate requiredPlan="pro" featureName="긍정 키워드">
        {result.positiveKeywords && result.positiveKeywords.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h2>긍정 키워드</h2>
            <div className="list">
              {result.positiveKeywords.map((k) => (
                <div className="row" key={k.keyword}>
                  <div className="left">{k.keyword}</div>
                  <div className="right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{k.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </PlanGate>

      {result.actionItems && result.actionItems.length > 0 ? (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>개선 액션 아이템</h2>
          <BlurGate
            visibleCount={gates.actionItemVisibleCount}
            totalCount={result.actionItems.length}
            featureName="개선 액션"
          >
            <div>
              {result.actionItems.map((item) => (
                <div className={`actionItem impact${item.impact.charAt(0).toUpperCase() + item.impact.slice(1)}`} key={item.id}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span className={`badge ${item.impact === "high" ? "badgeDanger" : item.impact === "medium" ? "badgeWarning" : "badgeSuccess"}`}>
                        {item.impact === "high" ? "높음" : item.impact === "medium" ? "중간" : "낮음"}
                      </span>
                      <span className="badge badgePrimary">{item.category === "detailPage" ? "상세페이지" : item.category === "csResponse" ? "CS응대" : "FAQ"}</span>
                    </div>
                    <div style={{ fontSize: 14 }}>{item.action}</div>
                    {item.relatedKeyword ? (
                      <div style={{ fontSize: 12, color: "var(--color-muted)", marginTop: 4 }}>
                        관련 키워드: {item.relatedKeyword}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-muted)" }}>{item.reviewCount}</div>
                </div>
              ))}
            </div>
          </BlurGate>
        </div>
      ) : null}

      {!caps?.supabaseConfigured && (
        <div className="actionRow" style={{ marginTop: 10 }}>
          <a className="btn btnPrimary" href="/dashboard/history">
            저장된 리포트 보기
          </a>
        </div>
      )}
    </>
  );
}
