import type { AnalysisOutput } from "@/lib/types";
import type { Capabilities } from "@/lib/capabilities";
import type { PlanGates } from "@/lib/types";

type AnalysisResultsSummaryProps = {
  result: AnalysisOutput & {
    meta: {
      filename: string | null;
      stored: boolean;
      analysisId?: string;
      truncated?: boolean;
    };
  };
  onDownloadPdf: () => void;
  busy: boolean;
  caps: Capabilities | null;
  gates: PlanGates;
};

export function AnalysisResultsSummary({ result, onDownloadPdf, busy, caps, gates }: AnalysisResultsSummaryProps) {
  const storageEnabled = caps?.supabaseConfigured === true;
  const storageLinkLabel = storageEnabled ? "저장된 리포트 보기" : "저장 기능 비활성";
  const negativeRatio = typeof result.stats.negativeRatio === "number" ? `${Math.round(result.stats.negativeRatio * 100)}%` : "-";
  const avgRating = result.stats.avgRating === null ? "미기재" : `${result.stats.avgRating.toFixed(1)}점`;
  const recentShare = result.stats.recentness?.hasDates ? `${Math.round((result.stats.recentness.last30Share ?? 0) * 100)}%` : "날짜 없음";
  const summaryStats = [
    { label: "총 리뷰", value: `${result.stats.total}건`, meta: result.meta.filename ?? "업로드 파일" },
    { label: "부정 비율", value: negativeRatio, meta: `부정 ${result.stats.negative ?? 0}건` },
    { label: "평균 별점", value: avgRating, meta: "별점 열이 있으면 계산" },
    { label: "최근 30일 비중", value: recentShare, meta: result.stats.recentness?.hasDates ? "최근성 반영" : "작성일 열 없음" }
  ];

  return (
    <section className="resultsBlock analysisResultsPrimary resultsHeroCard">
      {result.meta.truncated ? (
        <p className="hint danger analysisResultsWarning">
          리뷰 수가 플랜 한도를 초과하여 {gates.maxReviewsPerAnalysis}개만 분석되었습니다. 전체 분석은 Basic 이상으로 업그레이드 후 이용하세요.
        </p>
      ) : null}

      {!result.stats.recentness?.hasDates ? (
        <p className="hint muted analysisResultsHintMuted">작성일 열이 없으면 최근 이슈는 계산되지 않거나 약하게 반영됩니다.</p>
      ) : null}

      <div className="resultsHeroHead">
        <div className="resultsHeroIntro">
          <p className="sectionEyebrow">Results overview</p>
          <h1 className="resultsHeroTitle">분석 결과 요약</h1>
          <p className="resultsHeroLead">핵심 KPI와 실행 우선순위를 먼저 확인하고, 필요한 경우 PDF로 바로 공유하세요.</p>
          <div className="resultsHeroMetaRow">
            <span className="pill pillActive">{result.meta.filename ?? "CSV"}</span>
            <span className="pill">{result.meta.stored ? "저장 완료" : "세션 결과"}</span>
            <span className="pill">{storageEnabled ? caps?.planLabel ?? "계정" : "게스트 모드"}</span>
          </div>
        </div>
        <div className="toolbar resultsToolbar">
          <button className="btn btnPrimary" onClick={onDownloadPdf} disabled={busy}>
            PDF 다운로드
          </button>
          <a
            className="btn"
            href="/dashboard/history"
            onClick={(event) => {
              if (!storageEnabled) event.preventDefault();
            }}
          >
            {storageLinkLabel}
          </a>
        </div>
      </div>

      <div className="resultsHeroStats">
        {summaryStats.map((stat) => (
          <article className="resultsHeroStat" key={stat.label}>
            <span className="resultsHeroStatLabel">{stat.label}</span>
            <strong className="resultsHeroStatValue">{stat.value}</strong>
            <span className="resultsHeroStatMeta">{stat.meta}</span>
          </article>
        ))}
      </div>
    </section>
  );
}
