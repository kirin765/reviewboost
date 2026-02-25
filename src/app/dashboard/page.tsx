"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";
import type { Capabilities } from "@/lib/capabilities";
import type { AnalysisOutput } from "@/lib/types";
import type { CsvPreview } from "@/lib/csv";
import { isApiErrorBody } from "@/lib/api_error";
import { gtagEvent } from "@/lib/analytics";
import FeedbackModal from "@/components/FeedbackModal";
import { PlanProvider, useGates } from "@/contexts/PlanContext";
import type { PlanTier } from "@/lib/types";
import DashboardTabs, { type DashboardTab } from "@/components/Dashboard/DashboardTabs";
import DashboardAnalysisPanel from "@/components/Dashboard/DashboardAnalysisPanel";
import AnalysisResults from "@/components/Dashboard/AnalysisResults";

type DashboardResult = AnalysisOutput & {
  meta: {
    filename: string | null;
    stored: boolean;
    analysisId?: string;
    truncated?: boolean;
    storageAttempted?: boolean;
    storageError?: string | null;
    storageStep?: string | null;
  };
};

function DashboardContent() {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [cellModal, setCellModal] = useState<{ col: string; value: string } | null>(null);
  const [showAllPreviewCols, setShowAllPreviewCols] = useState(false);
  const [textCol, setTextCol] = useState<string>("");
  const [ratingCol, setRatingCol] = useState<string>("");
  const [dateCol, setDateCol] = useState<string>("");
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [analysisDoneNotice, setAnalysisDoneNotice] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>("analysis");

  const gates = useGates();

  const step = useMemo(() => {
    if (!file) return 1;
    if (!preview) return 2;
    if (!result) return 3;
    return 4;
  }, [file, preview, result]);

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
  }

  function friendlyErrorMessage(raw: string) {
    const s = String(raw || "").trim();
    if (!s) return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
    if (s.includes("업로드 파일을 읽을 수 없습니다")) return "파일을 읽지 못했어요. 다시 선택해서 시도해주세요.";
    if (s.includes("로그인이 필요합니다")) return "저장된 리포트를 보려면 로그인이 필요합니다.";
    return s;
  }

  async function readErrorText(res: Response): Promise<string> {
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      try {
        const json = await res.json();
        if (isApiErrorBody(json)) {
          const msg = String(json.error.message ?? "").trim();
          const help = Array.isArray(json.error.help)
            ? json.error.help
                .map((h) => String(h).trim())
                .filter(Boolean)
            : [];
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
    setAnalysisDoneNotice("미리보기가 준비되었습니다. 다음은 분석을 진행해 주세요.");

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
      const json = (await res.json()) as DashboardResult;

      setResult(json);
      setAnalysisDoneNotice("분석이 완료되었습니다.");
      gtagEvent("analysis_complete", {
        total_reviews: json.stats.total,
        priority_score: Number(json.stats.priorityScore.toFixed(1)),
        negative_ratio: Number(json.stats.negativeRatio.toFixed(4))
      });
      setActiveTab("results");
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
      await loadPreview(f);
      setAnalysisDoneNotice("샘플 파일이 업로드되어 미리보기가 준비되었습니다.");
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

    if (cellModal) {
      window.addEventListener("keydown", onKeyDown);
      return () => window.removeEventListener("keydown", onKeyDown);
    }

    return undefined;
  }, [cellModal]);

  useEffect(() => {
    if (result && result.stats && gates.maxReviewsPerAnalysis > 0 && result.stats.total === 0) {
      setAnalysisDoneNotice("분석 결과가 없습니다. 데이터 행을 확인해주세요.");
    }
  }, [result, gates.maxReviewsPerAnalysis]);

  useEffect(() => {
    if (result && !caps?.supabaseConfigured) {
      setAnalysisDoneNotice("분석이 완료되었습니다. 저장 기능이 비활성 상태여서 PDF로만 보관 가능합니다.");
    }
  }, [result, caps?.supabaseConfigured]);

  useEffect(() => {
    if (result) {
      setActiveTab("results");
    }
  }, [result]);

  const handleFileSelect = (newFile: File | null) => {
    setFile(newFile);
    setPreview(null);
    setResult(null);
    setError(null);
    setShowAllPreviewCols(false);
    setTextCol("");
    setRatingCol("");
    setDateCol("");
  };

  const handleCellClick = (col: string, value: string) => {
    setCellModal({ col, value });
  };

  const handleErrorClose = () => setError(null);

  return (
    <main className="pageMain analysisWorkspace">
      {error ? <FeedbackModal title="분석 처리 오류" message={error} tone="error" onClose={handleErrorClose} /> : null}
      {!error && analysisDoneNotice ? (
        <FeedbackModal title="분석 완료" message={analysisDoneNotice} onClose={() => setAnalysisDoneNotice(null)} />
      ) : null}

      <DashboardTabs
        activeTab={activeTab}
        onChange={(next) => {
          setActiveTab(next);
        }}
      />

      <div className="card heroCard">
        {activeTab === "analysis" ? (
          <DashboardAnalysisPanel
            file={file}
            busy={busy}
            preview={preview}
            caps={caps}
            step={step}
            textCol={textCol}
            ratingCol={ratingCol}
            dateCol={dateCol}
            showAllPreviewCols={showAllPreviewCols}
            cellModal={cellModal}
            onFileSelect={handleFileSelect}
            onReset={resetAll}
            onSample={onSample}
            onAnalyze={onAnalyze}
            onTextColChange={setTextCol}
            onRatingColChange={setRatingCol}
            onDateColChange={setDateCol}
            onTogglePreviewCols={() => setShowAllPreviewCols((v) => !v)}
            onCellClick={handleCellClick}
            onCellModalClose={() => setCellModal(null)}
          />
        ) : result ? (
          <section id="results-panel" role="tabpanel" aria-labelledby="results-tab">
            <AnalysisResults
              result={result}
              caps={caps}
              busy={busy}
              onDownloadPdf={onDownloadPdf}
            />
          </section>
        ) : (
          <section id="results-panel" role="tabpanel" aria-labelledby="results-tab" className="dashboardEmptyResult">
            <div className="card">
              <h2>아직 분석 결과가 없습니다</h2>
              <p className="hint">CSV를 업로드하고 분석을 완료하면, 리포트가 이곳에 표시됩니다.</p>
              <button
                type="button"
                className="btn btnPrimary"
                onClick={() => setActiveTab("analysis")}
                aria-label="분석하기 탭으로 이동"
              >
                분석하기로 이동
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default function DashboardPage() {
  const [caps, setCaps] = useState<Capabilities | null>(null);
  const [plan, setPlan] = useState<PlanTier>("free");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/capabilities")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j) {
          setCaps(j as Capabilities);
          setPlan((j as Capabilities).plan as PlanTier);
        }
      })
      .catch(() => {
        // ignore
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PlanProvider plan={plan}>
      <DashboardContent />
    </PlanProvider>
  );
}
