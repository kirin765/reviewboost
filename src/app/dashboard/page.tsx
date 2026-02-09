"use client";

import { useEffect, useMemo, useState } from "react";
import type { Capabilities } from "@/lib/capabilities";
import CopyButton from "@/components/CopyButton";

type AnalysisResult = {
  stats: {
    total: number;
    positive: number;
    negative: number;
    neutral: number;
    positiveRatio: number;
    negativeRatio: number;
    avgRating: number | null;
    negativeKeywordsTop10: Array<{ keyword: string; count: number }>;
    categoryCounts: Record<string, number>;
    priorityScore: number;
    recentness?: {
      hasDates: boolean;
      last30Share: number;
      last90Share: number;
      last30NegativeRatio: number | null;
    };
  };
  suggestions: {
    detailPageCopy: string[];
    csResponseTemplates: string[];
    faqRecommendations: string[];
    notes: string[];
  };
  meta: {
    filename: string | null;
    stored: boolean;
    analysisId?: string;
  };
};

type CsvPreview = {
  filename: string | null;
  headerMode: "header" | "headerless";
  columns: string[];
  inferred: { headerMode: "header" | "headerless"; textCol: string; ratingCol?: string | null; dateCol?: string | null };
  sampleRows: Array<Record<string, string>>;
  totalRows: number;
  warnings: string[];
};

export default function DashboardPage() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [textCol, setTextCol] = useState<string>("");
  const [ratingCol, setRatingCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [useLLM, setUseLLM] = useState<boolean>(false);
  const [caps, setCaps] = useState<Capabilities | null>(null);

  const summary = useMemo(() => {
    if (!result) return null;
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
    let cancelled = false;
    fetch("/api/capabilities")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) setCaps(j as Capabilities);
      })
      .catch(() => {
        // ignore
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const step = useMemo(() => {
    if (!file) return 1;
    if (!preview) return 2;
    if (!result) return 3;
    return 4;
  }, [file, preview, result]);

  function friendlyErrorMessage(raw: string) {
    const s = String(raw || "").trim();
    if (!s) return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    if (s.includes("CSV 파싱 실패")) return "CSV를 읽지 못했어요. 엑셀에서 'CSV(쉼표로 구분)'로 저장했는지 확인해주세요.";
    if (s.includes("빈 파일")) return "빈 파일이에요. 내용이 있는 CSV를 올려주세요.";
    if (s.includes("파일이 너무 큽니다")) return "파일이 너무 커서 업로드할 수 없어요. CSV를 나눠서 시도해주세요.";
    if (s.includes("업로드 파일을 읽을 수 없습니다")) return "파일을 읽지 못했어요. 다시 선택해서 시도해주세요.";
    if (s.includes("로그인이 필요합니다")) return "저장된 리포트를 보려면 로그인이 필요합니다.";
    return s;
  }

  async function loadPreview(f: File) {
    const fd = new FormData();
    fd.set("file", f);
    const res = await fetch("/api/preview", { method: "POST", body: fd });
    if (!res.ok) throw new Error(await res.text());
    const json = (await res.json()) as CsvPreview;
    setPreview(json);
    setTextCol(json.inferred.textCol ?? "");
    setRatingCol((json.inferred.ratingCol ?? "") || "");
    setDateCol((json.inferred.dateCol ?? "") || "");
  }

  async function onAnalyze() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      if (!preview) {
        await loadPreview(file);
        return;
      }
      const fd = new FormData();
      fd.set("file", file);
      fd.set("headerMode", preview.headerMode);
      fd.set("textCol", textCol);
      if (ratingCol) fd.set("ratingCol", ratingCol);
      if (dateCol) fd.set("dateCol", dateCol);
      if (useLLM) fd.set("useLLM", "1");
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as AnalysisResult;
      setResult(json);
    } catch (e: any) {
      setError(friendlyErrorMessage(e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function onDownloadPdf() {
    if (!result) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(result)
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reviewboost-report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(friendlyErrorMessage(e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ marginTop: 18 }}>
      <div className="grid">
        <div className="card">
          <h2>리뷰 CSV 분석</h2>
          <div className="pillRow" style={{ marginBottom: 10 }}>
            <span className={`pill ${step === 1 ? "pillActive" : ""}`}>1. 파일 선택</span>
            <span className={`pill ${step === 2 ? "pillActive" : ""}`}>2. 미리보기</span>
            <span className={`pill ${step === 3 ? "pillActive" : ""}`}>3. 분석</span>
            <span className={`pill ${step === 4 ? "pillActive" : ""}`}>4. 결과</span>
          </div>

          <p className="muted" style={{ marginTop: 0 }}>
            리뷰 내용이 들어있는 CSV 파일을 올려주세요. 샘플로 먼저 테스트해도 됩니다:{" "}
            <a className="link" href="/sample.csv" download>
              샘플 CSV 다운로드
            </a>
          </p>
          <input
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreview(null);
              setResult(null);
              setError(null);
              setTextCol("");
              setRatingCol("");
              setDateCol("");
            }}
            disabled={busy}
          />
          <div className="hint">
            {file ? (
              <span>
                선택됨: <code>{file.name}</code> ({Math.round(file.size / 1024)} KB)
              </span>
            ) : (
              <span>CSV 파일을 선택하세요.</span>
            )}
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <button className="btn btnPrimary" onClick={onAnalyze} disabled={!file || busy}>
              {busy ? "처리 중..." : preview ? "분석 시작" : "다음: 미리보기"}
            </button>
            <button className="btn" onClick={onDownloadPdf} disabled={!result || busy}>
              PDF 다운로드
            </button>
            <button
              className="btn"
              onClick={() => {
                setFile(null);
                setPreview(null);
                setResult(null);
                setError(null);
                setTextCol("");
                setRatingCol("");
                setDateCol("");
              }}
              disabled={busy}
            >
              새로 시작
            </button>
          </div>

          {preview ? (
            <div style={{ marginTop: 12 }}>
              <div className="pill">
                행 {preview.totalRows} · 컬럼 {preview.columns.length} · {preview.headerMode === "header" ? "헤더 있음" : "헤더 없음"}
              </div>
              <div className="hint" style={{ marginTop: 10 }}>
                <div style={{ display: "grid", gap: 10 }}>
                  <label>
                    <span className="muted">리뷰 내용(텍스트) 열</span>
                    <select className="input" value={textCol} onChange={(e) => setTextCol(e.target.value)} disabled={busy}>
                      {preview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="muted">별점 열 (선택)</span>
                    <select className="input" value={ratingCol} onChange={(e) => setRatingCol(e.target.value)} disabled={busy}>
                      <option value="">(없음)</option>
                      {preview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="muted">작성일 열 (선택, 최근 이슈 확인용)</span>
                    <select className="input" value={dateCol} onChange={(e) => setDateCol(e.target.value)} disabled={busy}>
                      <option value="">(없음)</option>
                      {preview.columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>
                  <details className="details">
                    <summary className="detailsSummary">고급 옵션 (선택)</summary>
                    <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                      <label className="pill" style={{ justifyContent: "space-between" }}>
                        <span>AI로 더 정확하게 분석</span>
                        <input
                          type="checkbox"
                          checked={useLLM}
                          onChange={(e) => setUseLLM(e.target.checked)}
                          disabled={busy || caps?.openaiConfigured === false}
                        />
                      </label>
                      {caps?.openaiConfigured === false ? (
                        <p className="hint muted" style={{ margin: 0 }}>
                          현재는 AI 연결이 꺼져 있어 기본 분석으로 진행됩니다.
                        </p>
                      ) : (
                        <p className="hint muted" style={{ margin: 0 }}>
                          AI 연결이 켜져 있으면 감성/카테고리를 더 정교하게 분류할 수 있습니다.
                        </p>
                      )}
                    </div>
                  </details>
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="muted">미리보기 (처음 몇 줄)</div>
                <div className="tableWrap" style={{ marginTop: 8 }}>
                  <table className="table">
                    <thead>
                      <tr>
                        {preview.columns.slice(0, 6).map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleRows.map((r, idx) => (
                        <tr key={idx}>
                          {preview.columns.slice(0, 6).map((c) => (
                            <td key={c}>{String(r[c] ?? "")}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.columns.length > 6 ? <p className="hint muted">컬럼이 많아 앞의 6개만 표시합니다.</p> : null}
              </div>
              {preview.warnings?.length ? (
                <p className="hint muted" style={{ whiteSpace: "pre-wrap" }}>
                  {preview.warnings.join("\n")}
                </p>
              ) : null}
            </div>
          ) : null}

          {error && (
            <p className="hint danger" style={{ whiteSpace: "pre-wrap" }}>
              {error}
            </p>
          )}
          {result?.meta?.stored ? (
            <p className="hint">
              저장됨: 나중에 “저장된 리포트”에서 다시 볼 수 있습니다.
            </p>
          ) : (
            <p className="hint muted">지금은 저장 없이 분석만 진행됩니다. (저장 기능은 로그인 기능을 켜면 사용할 수 있어요.)</p>
          )}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
            <a className="btn" href="/dashboard/history">
              저장된 리포트
            </a>
            {result?.meta?.stored && result.meta.analysisId ? (
              <a className="btn" href={`/dashboard/analysis/${result.meta.analysisId}`}>
                저장된 분석 보기
              </a>
            ) : null}
          </div>
        </div>

        <div className="card">
          <h2>핵심 지표</h2>
          {!summary ? (
            <p className="muted">분석 결과가 여기에 표시됩니다.</p>
          ) : (
            <div className="kpiRow">
              <div className="kpi">
                <div className="label">리뷰 수</div>
                <div className="value">{summary.total}</div>
              </div>
              <div className="kpi">
                <div className="label">부정 비율</div>
                <div className="value" style={{ color: "var(--warn)" }}>
                  {summary.neg}
                </div>
              </div>
              <div className="kpi">
                <div className="label">우선순위 점수</div>
                <div className="value" style={{ color: "var(--accent)" }}>
                  {summary.score}
                </div>
              </div>
            </div>
          )}
          {result && (
            <div style={{ marginTop: 12 }}>
              <div className="pill">긍정 {Math.round(result.stats.positiveRatio * 100)}%</div>{" "}
              <div className="pill">중립 {Math.round((result.stats.neutral / result.stats.total) * 100)}%</div>{" "}
              <div className="pill">평균 별점 {result.stats.avgRating === null ? "-" : result.stats.avgRating.toFixed(2)}</div>
              {summary?.last30 ? <div className="pill">최근30일 비중 {summary.last30}</div> : null}
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="grid">
          <div className="card">
            <h2>부정 키워드 TOP10</h2>
            {result.stats.negativeKeywordsTop10.length === 0 ? (
              <p className="muted">부정 키워드를 찾지 못했습니다.</p>
            ) : (
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
      )}

      {result && (
        <div className="grid">
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
      )}

    </main>
  );
}
