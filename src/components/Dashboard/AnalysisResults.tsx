"use client";

import { useMemo, useRef, useEffect, useState } from "react";
import type { Capabilities } from "@/lib/capabilities";
import type { AnalysisOutput } from "@/lib/types";
import CopyButton from "@/components/CopyButton";
import { useGates } from "@/contexts/PlanContext";
import PlanGate from "@/components/PlanGate";
import BlurGate from "@/components/BlurGate";

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

  const summary = useMemo(() => {
    const { stats } = result;
    return {
      total: stats.total,
      pos: `${Math.round(stats.positiveRatio * 100)}%`,
      neg: `${Math.round(stats.negativeRatio * 100)}%`,
      avg: stats.avgRating === null ? "-" : stats.avgRating.toFixed(2),
      score: stats.priorityScore.toFixed(1),
      last30: stats.recentness?.hasDates ? `${Math.round((stats.recentness.last30Share ?? 0) * 100)}%` : null
    };
  }, [result]);

  useEffect(() => {
    if (!result || !summaryCardRef.current) return;
    summaryCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setAnalysisDoneNotice("분석이 완료되었습니다. 핵심 지표로 이동했습니다.");
  }, [result]);

  return (
    <>
      {analysisDoneNotice ? (
        <div className="card" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success)', marginBottom: 16 }}>
          <p style={{ margin: 0, color: 'var(--color-success)', fontWeight: 500 }}>
            {analysisDoneNotice}
          </p>
        </div>
      ) : null}

      <div className="grid">
        <div className="card" ref={summaryCardRef}>
          <h2>핵심 지표</h2>
          <div className="kpiRow">
            <div className="kpiCard kpiCardPrimary">
              <div className="label">리뷰 수</div>
              <div className="value">{summary.total}</div>
              <div className="miniProgress">
                <div className="miniProgressBar" style={{ width: '100%' }}></div>
              </div>
            </div>
            <div className="kpiCard kpiCardDanger">
              <div className="label">부정 비율</div>
              <div className="value" style={{ color: "var(--color-danger)" }}>
                {summary.neg}
              </div>
              <div className="subtext">낮을수록 좋음</div>
            </div>
            <div className="kpiCard kpiCardSuccess">
              <div className="label">평균 별점</div>
              <div className="value" style={{ color: "var(--color-success)" }}>
                {result?.stats?.avgRating === null ? '-' : result?.stats?.avgRating?.toFixed(2) ?? '-'}
              </div>
              <div className="subtext">/ 5.0</div>
            </div>
            <div className="kpiCard kpiCardWarning">
              <div className="label">우선순위 점수</div>
              <div className="value" style={{ color: "var(--color-warning)" }}>
                {summary.score}
              </div>
              <div className="subtext">높을수록 긴급</div>
            </div>
          </div>
          <p className="hint">
            우선순위 점수는 &ldquo;지금 먼저 개선할 가치&rdquo;를 0~100으로 요약한 값입니다. 부정 비율(부정/전체)이 높고, 최근
            이슈(최근30일 비중)가 높을수록 우선순위가 올라갑니다.
          </p>
          {result?.meta?.truncated ? (
            <p className="hint" style={{ color: 'var(--color-warning)', marginTop: -8 }}>
              리뷰 수가 플랜 한도를 초과하여 {gates.maxReviewsPerAnalysis}개만 분석되었습니다. 전체 분석은 Basic 이상으로 업그레이드 후 이용하세요.
            </p>
          ) : null}
          {!result?.stats.recentness?.hasDates ? (
            <p className="hint muted">작성일 열이 없으면 &ldquo;최근 이슈&rdquo;는 계산되지 않거나 약하게만 반영됩니다.</p>
          ) : null}
          <div className="toolbar">
            <button className="btn" onClick={onDownloadPdf} disabled={!result || busy}>
              PDF 다운로드
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div className="pill">긍정 {Math.round(result.stats.positiveRatio * 100)}%</div>{" "}
        <div className="pill">중립 {Math.round((result.stats.neutral / result.stats.total) * 100)}%</div>{" "}
        <div className="pill">평균 별점 {result.stats.avgRating === null ? "-" : result.stats.avgRating.toFixed(2)}</div>
        {summary?.last30 ? <div className="pill">최근30일 비중 {summary.last30}</div> : null}
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>부정 키워드 TOP10</h2>
          {result.stats.negativeKeywordsTop10.length === 0 ? (
            <p className="muted">부정 키워드를 찾지 못했습니다.</p>
          ) : (
            <BlurGate
              visibleCount={gates.negativeKeywordVisibleCount}
              totalCount={result.stats.negativeKeywordsTop10.length}
              featureName="부정 키워드"
            >
              <div className="list">
                {result.stats.negativeKeywordsTop10.map((k) => (
                  <div className="row" key={k.keyword}>
                    <div className="left">
                      <strong>{k.keyword}</strong>
                    </div>
                    <div className="right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span>{k.count}</span>
                      <CopyButton text={k.keyword} />
                    </div>
                  </div>
                ))}
              </div>
            </BlurGate>
          )}
        </div>

        <div className="card">
          <h2>문제 카테고리</h2>
          <div className="list">
            {Object.entries(result.stats.categoryCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([cat, count]) => (
                <div className="row" key={cat}>
                  <div className="left">{cat}</div>
                  <div className="right" style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span>{count}</span>
                    <CopyButton text={cat} />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      <div className="grid" style={{ marginTop: 16 }}>
        <div className="card">
          <h2>개선 제안: 상세페이지 문구</h2>
          <div className="list">
            {result.suggestions.detailPageCopy.map((s, idx) => (
              <div className="row" key={idx} style={{ alignItems: "flex-start" }}>
                <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                  {s}
                </div>
                <div className="right">
                  <CopyButton text={s} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2>개선 제안: CS 응대/FAQ</h2>
          <div className="list">
            {result.suggestions.csResponseTemplates.map((s, idx) => (
              <div className="row" key={`cs-${idx}`} style={{ alignItems: "flex-start" }}>
                <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                  {s}
                </div>
                <div className="right">
                  <CopyButton text={s} />
                </div>
              </div>
            ))}
            {result.suggestions.faqRecommendations.map((s, idx) => (
              <div className="row" key={`faq-${idx}`} style={{ alignItems: "flex-start" }}>
                <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                  {s}
                </div>
                <div className="right">
                  <CopyButton text={s} />
                </div>
              </div>
            ))}
          </div>
          {result.suggestions.notes.length > 0 && (
            <>
              <p className="hint" style={{ marginBottom: 0 }}>
                메모
              </p>
              <div className="list">
                {result.suggestions.notes.map((n, i) => (
                  <div className="row" key={`note-${i}`} style={{ alignItems: "flex-start" }}>
                    <div className="left" style={{ whiteSpace: "pre-wrap" }}>
                      {n}
                    </div>
                    <div className="right">
                      <CopyButton text={n} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* V2: Urgent Reviews */}
      {result.urgentReviews && result.urgentReviews.length > 0 && (
        <div className="grid" style={{ marginTop: 16 }}>
          <div className="card">
            <h2>긴급 대응 필요 리뷰</h2>
            <p className="hint" style={{ marginTop: -4, marginBottom: 12 }}>
              별점 1~2점 + 부정 감정 리뷰 중 최근 7일 이내 또는 저별점 우선 10건
            </p>
            <BlurGate
              visibleCount={gates.urgentReviewVisibleCount}
              totalCount={result.urgentReviews.length}
              featureName="긴급 대응"
            >
              <div>
                {result.urgentReviews.map((ur, idx) => (
                  <div className="urgentReview" key={idx}>
                    <div className="row" style={{ background: 'transparent', border: 'none', padding: '4px 0' }}>
                      <div className="left">
                        <span className="badge badgeDanger">{ur.review.rating}점</span>
                        <span className="badge" style={{ marginLeft: 6, background: 'var(--color-bg-soft)' }}>{ur.review.category}</span>
                      </div>
                      <div className="right" style={{ fontSize: 12, color: 'var(--color-muted)' }}>
                        {ur.daysSinceWritten !== null ? `${ur.daysSinceWritten}일 전` : '날짜 없음'}
                      </div>
                    </div>
                    <div style={{ marginTop: 8, fontSize: 14 }}>{ur.highlightedText}</div>
                  </div>
                ))}
              </div>
            </BlurGate>
          </div>
        </div>
      )}

      {/* V2: Priority Matrix */}
      {result.priorityMatrix && result.priorityMatrix.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>우선순위 매트릭스</h2>
          <p className="hint" style={{ marginTop: -4, marginBottom: 16 }}>
            카테고리별 빈도(발생빈도)와 영향도(비즈니셜 영항)를 기반으로 개선 우선순위 분류
          </p>
          <div className="priorityMatrix">
            {result.priorityMatrix.map((pm, idx) => (
              <div className={`quadrant ${pm.quadrant}`} key={idx}>
                <div className="quadrantTitle">
                  {pm.category} ({pm.frequency}건, {pm.frequencyPct}%)
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>
                  영향도: {pm.impact}/10
                </div>
                {gates.showPriorityActionSummary ? (
                  <div style={{ fontSize: 12, marginTop: 6, color: '#555' }}>
                    {pm.actionSummary}
                  </div>
                ) : (
                  <div style={{ fontSize: 12, marginTop: 6, color: '#555', filter: 'blur(4px)', opacity: 0.5, userSelect: 'none' }}>
                    {pm.actionSummary}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', background: 'rgba(255,255,255,0.9)', padding: '4px 8px', borderRadius: 4, fontSize: 11 }}>
                      Basic 이상
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* V2: Rating Simulation */}
      <PlanGate requiredPlan="pro" featureName="별점 시뮬레이션">
        {result.ratingSimulation && result.ratingSimulation.scenarios.length > 0 && (
          <div className="card" style={{ marginTop: 16 }}>
            <h2>별점 시뮬레이션</h2>
            <p className="hint" style={{ marginTop: -4, marginBottom: 16 }}>
              부정 리뷰 해결 시 예상되는 평균 별점 변화 (현재: {result.ratingSimulation.currentAvg.toFixed(2)}점)
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              {result.ratingSimulation.scenarios.map((sc, idx) => (
                <div className="simulationCard" key={idx}>
                  <div className="simulationLabel">{sc.label}</div>
                  <div className="simulationValue">{sc.newAvg.toFixed(2)}점</div>
                  <div className={`simulationDelta ${sc.delta >= 0 ? 'positive' : 'negative'}`}>
                    {sc.delta >= 0 ? '+' : ''}{sc.delta.toFixed(2)}점
                    <span style={{ fontSize: 12, color: 'var(--color-muted)', marginLeft: 6 }}>
                      ({sc.resolvedCount}건 해결)
                    </span>
                  </div>
                  {sc.relatedKeywords.length > 0 && (
                    <div style={{ fontSize: 11, marginTop: 8, color: 'var(--color-muted)' }}>
                      관련: {sc.relatedKeywords.join(', ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </PlanGate>

      {/* V2: Positive Keywords */}
      <PlanGate requiredPlan="pro" featureName="긍정 키워드">
        {result.positiveKeywords && result.positiveKeywords.length > 0 && (
          <div className="grid" style={{ marginTop: 16 }}>
            <div className="card">
              <h2>긍정 키워드</h2>
              <p className="hint" style={{ marginTop: -4, marginBottom: 12 }}>
                고객이 만족하는 주요 포인트
              </p>
              <div className="list">
                {result.positiveKeywords.map((k) => (
                  <div className="row" key={k.keyword}>
                    <div className="left">
                      <strong>{k.keyword}</strong>
                    </div>
                    <div className="right" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{k.count}</span>
                      <CopyButton text={k.keyword} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </PlanGate>

      {/* V2: Action Items */}
      {result.actionItems && result.actionItems.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <h2>개선 액션 아이템</h2>
          <p className="hint" style={{ marginTop: -4, marginBottom: 16 }}>
            우선적으로 해결해야 할 개선 항목들
          </p>
          <BlurGate
            visibleCount={gates.actionItemVisibleCount}
            totalCount={result.actionItems.length}
            featureName="개선 액션"
          >
            <div>
              {result.actionItems.map((item) => (
                <div className={`actionItem impact${item.impact.charAt(0).toUpperCase() + item.impact.slice(1)}`} key={item.id}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span className={`badge badge${item.impact === 'high' ? 'Danger' : item.impact === 'medium' ? 'Warning' : 'Success'}`}>
                        {item.impact === 'high' ? '높음' : item.impact === 'medium' ? '중간' : '낮음'}
                      </span>
                      <span className="badge badgePrimary">
                        {item.category === 'detailPage' ? '상세페이지' : item.category === 'csResponse' ? 'CS응대' : 'FAQ'}
                      </span>
                    </div>
                    <div style={{ fontSize: 14 }}>{item.action}</div>
                    {item.relatedKeyword && (
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 4 }}>
                        관련 키워드: {item.relatedKeyword}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--color-muted)' }}>
                    {item.reviewCount}
                  </div>
                </div>
              ))}
            </div>
          </BlurGate>
        </div>
      )}
    </>
  );
}
