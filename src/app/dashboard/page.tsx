"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Capabilities } from "@/lib/capabilities";
import CopyButton from "@/components/CopyButton";
import { isApiErrorBody } from "@/lib/api_error";
import { gtagEvent } from "@/lib/analytics";
import FeedbackModal from "@/components/FeedbackModal";
import { PlanProvider, useGates } from "@/contexts/PlanContext";
import PlanGate from "@/components/PlanGate";
import BlurGate from "@/components/BlurGate";
import type { PlanTier } from "@/lib/types";

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
    truncated?: boolean;
  };
  // V2 new fields
  urgentReviews?: Array<{
    review: { text: string; rating: number | null; sentiment: string; category: string };
    highlightedText: string;
    daysSinceWritten: number | null;
  }>;
  priorityMatrix?: Array<{
    category: string;
    frequency: number;
    frequencyPct: number;
    impact: number;
    quadrant: 'critical' | 'monitor' | 'review' | 'observe';
    actionSummary: string;
  }>;
  ratingSimulation?: {
    currentAvg: number;
    scenarios: Array<{
      label: string;
      resolvedCount: number;
      newAvg: number;
      delta: number;
      relatedKeywords: string[];
    }>;
  };
  positiveKeywords?: Array<{ keyword: string; count: number; sentiment: string }>;
  actionItems?: Array<{
    id: string;
    action: string;
    relatedKeyword: string;
    reviewCount: number;
    impact: 'high' | 'medium' | 'low';
    category: 'detailPage' | 'csResponse' | 'faq';
  }>;
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

function DashboardContent() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const summaryCardRef = useRef<HTMLDivElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [cellModal, setCellModal] = useState<{ col: string; value: string } | null>(null);
  const [showAllPreviewCols, setShowAllPreviewCols] = useState(false);
  const [textCol, setTextCol] = useState<string>("");
  const [ratingCol, setRatingCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);
  const gates = useGates();

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

  const previewCols = useMemo(() => {
    if (!preview) return [];
    return showAllPreviewCols ? preview.columns : preview.columns.slice(0, 6);
  }, [preview, showAllPreviewCols]);

  const previewTableMinWidth = useMemo(() => {
    // Make the table horizontally scrollable when showing many columns.
    return Math.max(520, previewCols.length * 140);
  }, [previewCols.length]);

  function resetAll() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setAnalysisDoneNotice(null);
    setShowAllPreviewCols(false);
    setTextCol("");
    setRatingCol("");
    setDateCol("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function friendlyErrorMessage(raw: string) {
    const s = String(raw || "").trim();
    if (!s) return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    if (s.includes("업로드 파일을 읽을 수 없습니다")) return "파일을 읽지 못했어요. 다시 선택해서 시도해주세요.";
    if (s.includes("로그인이 필요합니다")) return "저장된 리포트를 보려면 로그인이 필요합니다.";
    return s;
  }

  function renderCellPreview(v: unknown) {
    const raw = String(v ?? "");
    const normalized = raw.replace(/\r\n/g, "\n").trim();
    if (!normalized) return "";

    // Keep newlines so the preview can show basic wrapping, but avoid huge cells.
    let truncated = false;
    const rawLines = normalized
      .split("\n")
      .map((l) => l.replace(/[ \t]+/g, " ").trimEnd());

    // Drop leading/trailing empty lines.
    while (rawLines.length && rawLines[0] === "") rawLines.shift();
    while (rawLines.length && rawLines[rawLines.length - 1] === "") rawLines.pop();

    if (rawLines.length > 3) truncated = true;
    let out = rawLines.slice(0, 3).join("\n").trim();

    const maxChars = 180;
    if (out.length > maxChars) {
      truncated = true;
      out = out.slice(0, maxChars).trimEnd();
    }

    return truncated ? `${out}…` : out;
  }

  async function readErrorText(res: Response): Promise<string> {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        const json = await res.json();
        if (isApiErrorBody(json)) {
          const msg = String(json.error.message ?? "").trim();
          const help = Array.isArray(json.error.help) ? json.error.help.map((h) => String(h).trim()).filter(Boolean) : [];
          const lines = [msg, ...help.map((h) => `- ${h}`)].filter(Boolean);
          return lines.join("\n");
        }
      } catch {
        // fall through to text()
      }
    }
    return friendlyErrorMessage(await res.text());
  }

  async function loadPreview(f: File) {
    const fd = new FormData();
    fd.set("file", f);
    const res = await fetch("/api/preview", { method: "POST", body: fd });
    if (!res.ok) throw new Error(await readErrorText(res));
    const json = (await res.json()) as CsvPreview;
    setPreview(json);
    setTextCol(json.inferred.textCol ?? "");
    setRatingCol((json.inferred.ratingCol ?? "") || "");
    setDateCol((json.inferred.dateCol ?? "") || "");

    gtagEvent("csv_upload", {
      file_name: f.name,
      file_size: f.size,
      rows: json.totalRows,
      columns: json.columns.length,
      header_mode: json.headerMode
    });
  }

  async function onAnalyze() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setAnalysisDoneNotice(null);
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
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.ok) throw new Error(await readErrorText(res));
      const json = (await res.json()) as AnalysisResult;
      setResult(json);
      gtagEvent("analysis_complete", {
        total_reviews: json.stats.total,
        priority_score: Number(json.stats.priorityScore.toFixed(1)),
        negative_ratio: Number(json.stats.negativeRatio.toFixed(4))
      });
    } catch (e: any) {
      setError(friendlyErrorMessage(e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  async function onSample() {
    setBusy(true);
    setError(null);
    setResult(null);
    setAnalysisDoneNotice(null);
    try {
      // Load sample.csv into a File so the rest of the pipeline can stay the same.
      const res = await fetch("/sample.csv", { cache: "no-store" });
      if (!res.ok) throw new Error("샘플 CSV를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      const blob = await res.blob();
      const f = new File([blob], "sample.csv", { type: "text/csv" });
      setFile(f);
      setPreview(null);
      setShowAllPreviewCols(false);
      setTextCol("");
      setRatingCol("");
      setDateCol("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadPreview(f);
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
      if (!res.ok) throw new Error(await readErrorText(res));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reviewboost-report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      gtagEvent("report_download", {
        file_name: a.download,
        total_reviews: result.stats.total
      });
    } catch (e: any) {
      setError(friendlyErrorMessage(e?.message ?? String(e)));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setCellModal(null);
    }
    if (cellModal) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [cellModal]);

  useEffect(() => {
    if (!result || !summaryCardRef.current) return;
    summaryCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    setAnalysisDoneNotice("분석이 완료되었습니다. 핵심 지표로 이동했습니다.");
  }, [result]);

  return (
    <main className="pageMain">
      {error ? <FeedbackModal title="분석 처리 오류" message={error} tone="error" /> : null}
      {!error && analysisDoneNotice ? (
        <FeedbackModal title="분석 완료" message={analysisDoneNotice} onClose={() => setAnalysisDoneNotice(null)} />
      ) : null}
      <div className="grid">
        <div className="card heroCard">
          <h1 className="heroTitle">리뷰 CSV 분석</h1>
          <div className="pillRow" style={{ marginBottom: 10 }}>
            <span className={`pill ${step === 1 ? "pillActive" : ""}`}>1. 파일 선택</span>
            <span className={`pill ${step === 2 ? "pillActive" : ""}`}>2. 미리보기</span>
            <span className={`pill ${step === 3 ? "pillActive" : ""}`}>3. 분석</span>
            <span className={`pill ${step === 4 ? "pillActive" : ""}`}>4. 결과</span>
          </div>

          <p className="heroLead">
            리뷰 내용이 들어있는 CSV 파일을 올려주세요. 샘플로 먼저 테스트해도 됩니다:{" "}
            <a className="link" href="/sample.csv" download>
              샘플 CSV 다운로드
            </a>
          </p>
          <div className="toolbar">
            <button className="btn btnWarn" onClick={onSample} disabled={busy}>
              샘플로 테스트
            </button>
            <button className="btn" onClick={resetAll} disabled={busy}>
              새로 시작
            </button>
          </div>
          <input
            ref={fileInputRef}
            className="input"
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setFile(f);
              setPreview(null);
              setResult(null);
              setError(null);
              setShowAllPreviewCols(false);
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
          <div className="toolbar">
            <button className="btn btnPrimary" onClick={onAnalyze} disabled={!file || busy}>
              {busy ? "처리 중..." : preview ? "분석 시작" : "다음: 미리보기"}
            </button>
          </div>
          {busy ? (
            <p className="hint" style={{ marginTop: 6 }}>
              {preview ? "리뷰를 분석 중입니다. 잠시만 기다려주세요." : "CSV 미리보기를 준비하고 있습니다."}
            </p>
          ) : null}

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
                </div>
              </div>
              <div style={{ marginTop: 12 }}>
                <div className="muted" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                  <span>미리보기 (처음 몇 줄)</span>
                  {preview.columns.length > 6 ? (
                    <button
                      type="button"
                      className="btn btnSmall"
                      onClick={() => setShowAllPreviewCols((v) => !v)}
                      disabled={busy}
                      aria-pressed={showAllPreviewCols}
                    >
                      {showAllPreviewCols ? "앞의 6개만 보기" : "전체 컬럼 보기"}
                    </button>
                  ) : null}
                </div>
                <p className="hint muted" style={{ marginTop: 6, marginBottom: 0 }}>
                  셀을 클릭하면 전체 내용을 볼 수 있습니다.
                </p>
                <div className="tableWrap" style={{ marginTop: 8 }}>
                  <table className="table" style={{ minWidth: previewTableMinWidth }}>
                    <thead>
                      <tr>
                        {previewCols.map((c) => (
                          <th key={c}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.sampleRows.map((r, idx) => (
                        <tr key={idx}>
                          {previewCols.map((c) => (
                            <td key={c}>
                              <button
                                type="button"
                                className="cellBtn"
                                title={String(r[c] ?? "")}
                                onClick={() => setCellModal({ col: c, value: String(r[c] ?? "") })}
                              >
                                {renderCellPreview(r[c])}
                              </button>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.columns.length > 6 && !showAllPreviewCols ? (
                  <p className="hint muted">컬럼이 많아 앞의 6개만 표시합니다. (전체 컬럼 보기 가능)</p>
                ) : null}
              </div>
              {preview.warnings?.length ? (
                <p className="hint muted" style={{ whiteSpace: "pre-wrap" }}>
                  {preview.warnings.join("\n")}
                </p>
              ) : null}
            </div>
          ) : null}

          {cellModal ? (
            <div className="modalOverlay" role="dialog" aria-modal="true" aria-label="셀 전체보기">
              <div className="modal">
                <div className="modalHeader">
                  <div>
                    <div className="muted">전체보기</div>
                    <div style={{ fontWeight: 800 }}>{cellModal.col}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <CopyButton text={cellModal.value} className="btn btnSmall btnPrimary">
                      전체 복사
                    </CopyButton>
                    <button type="button" className="btn btnSmall" onClick={() => setCellModal(null)}>
                      닫기
                    </button>
                  </div>
                </div>
                <div className="modalBody" style={{ whiteSpace: "pre-wrap" }}>
                  {cellModal.value || <span className="muted">(빈 값)</span>}
                </div>
              </div>
              <button type="button" className="modalBackdrop" aria-label="닫기" onClick={() => setCellModal(null)} />
            </div>
          ) : null}

          {result?.meta?.stored ? (
            <p className="hint">
              저장됨: 나중에 “저장된 리포트”에서 다시 볼 수 있습니다.
            </p>
          ) : caps?.supabaseConfigured === false ? (
            <>
              <p className="hint muted">
                지금은 저장 기능이 꺼져 있어 저장되지 않습니다. 대신 <strong>PDF 다운로드</strong>로 공유할 수 있어요.
              </p>
              <p className="hint muted" style={{ marginTop: 6 }}>
                현재 플랜: <strong>{caps.planLabel}</strong> · 이번 달 사용량: {caps.monthlyUsed}
                {typeof caps.monthlyLimit === "number" ? ` / ${caps.monthlyLimit}` : ""}
              </p>
            </>
          ) : caps ? (
            <p className="hint muted">
              현재 플랜: <strong>{caps.planLabel}</strong> · 이번 달 사용량: {caps.monthlyUsed}
              {typeof caps.monthlyLimit === "number" ? ` / ${caps.monthlyLimit}` : ""}
            </p>
          ) : (
            <p className="hint muted">지금은 저장 없이 분석만 진행됩니다. (저장 기능은 로그인 기능을 켜면 사용할 수 있어요.)</p>
          )}
          <div className="actionRow">
            {caps?.supabaseConfigured === false ? null : (
              <a className="btn" href="/dashboard/history">
                저장된 리포트
              </a>
            )}
            {result?.meta?.stored && result.meta.analysisId ? (
              <a className="btn" href={`/dashboard/analysis/${result.meta.analysisId}`}>
                저장된 분석 보기
              </a>
            ) : null}
          </div>
        </div>

        <div className="card" ref={summaryCardRef}>
          <h2>핵심 지표</h2>
          {!summary ? (
            <p className="muted">분석 결과가 여기에 표시됩니다.</p>
          ) : (
            <>
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
                <p className="hint muted">작성일 열이 없으면 “최근 이슈”는 계산되지 않거나 약하게만 반영됩니다.</p>
              ) : null}
              <div className="toolbar">
                <button className="btn" onClick={onDownloadPdf} disabled={!result || busy}>
                  PDF 다운로드
                </button>
              </div>
            </>
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

      {/* V2: Urgent Reviews */}
      {result && result.urgentReviews && result.urgentReviews.length > 0 && (
        <div className="grid">
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
      {result && result.priorityMatrix && result.priorityMatrix.length > 0 && (
        <div className="card">
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
        {result && result.ratingSimulation && result.ratingSimulation.scenarios.length > 0 && (
          <div className="card">
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
        {result && result.positiveKeywords && result.positiveKeywords.length > 0 && (
          <div className="grid">
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
      {result && result.actionItems && result.actionItems.length > 0 && (
        <div className="card">
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

    </main>
  );
}

export default function DashboardPage() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [plan, setPlan] = useState<PlanTier>("free");

  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j) {
          setCaps(j as Capabilities);
          setPlan((j as Capabilities).plan as PlanTier);
        }
      })
      .catch(() => {
        // ignore
      });
  }, []);

  return (
    <PlanProvider plan={plan}>
      <DashboardContent />
    </PlanProvider>
  );
}
