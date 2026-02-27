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

  return (
    <section className="resultsBlock analysisResultsPrimary">
      <div className="kpiMetaTags" aria-label="분류 지표 요약">
        <span className="pill">긍정 {Math.round(result.stats.positiveRatio * 100)}%</span>
        <span className="pill">중립 {Math.round(result.stats.negativeRatio * 100)}%</span>
        <span className="pill">평균 별점 {result.stats.avgRating === null ? "-" : result.stats.avgRating.toFixed(2)}</span>
      </div>

      {result.meta.truncated ? (
        <p className="hint danger analysisResultsWarning">
          리뷰 수가 플랜 한도를 초과하여 {gates.maxReviewsPerAnalysis}개만 분석되었습니다. 전체 분석은 Basic 이상으로 업그레이드 후 이용하세요.
        </p>
      ) : null}

      {!result?.stats?.recentness?.hasDates ? (
        <p className="hint muted analysisResultsHintMuted">작성일 열이 없으면 최근 이슈는 계산되지 않거나 약하게 반영됩니다.</p>
      ) : null}

      <div className="toolbar">
        <button className="btn btnPrimary" onClick={onDownloadPdf} disabled={busy}>
          PDF 다운로드
        </button>
        <a
          className="btn"
          href="/dashboard/history"
          onClick={(e) => {
            if (!storageEnabled) e.preventDefault();
          }}
        >
          {storageLinkLabel}
        </a>
      </div>
    </section>
  );
}
