"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Capabilities } from "@/lib/capabilities";
import type { AnalysisOutput } from "@/lib/types";
import type { CsvPreview } from "@/lib/csv";
import { isApiErrorBody } from "@/lib/api_error";
import { gtagEvent } from "@/lib/analytics";
import FeedbackModal from "@/components/FeedbackModal";
import { PlanProvider, useGates } from "@/contexts/PlanContext";
import type { PlanTier } from "@/lib/types";
import FileUploader from "@/components/Dashboard/FileUploader";
import CsvPreviewComponent from "@/components/Dashboard/CsvPreview";
import AnalysisResults from "@/components/Dashboard/AnalysisResults";

type AnalysisResult = AnalysisOutput & {
  meta: {
    filename: string | null;
    stored: boolean;
    analysisId?: string;
    truncated?: boolean;
  };
};

function DashboardContent() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    if (fileInputRef.current) fileInputRef.current.value = "";
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
  const handleAnalysisDoneClose = () => setAnalysisDoneNotice(null);

  return (
    <main className="pageMain">
      {error ? <FeedbackModal title="분석 처리 오류" message={error} tone="error" onClose={handleErrorClose} /> : null}
      {!error && analysisDoneNotice ? (
        <FeedbackModal title="분석 완료" message={analysisDoneNotice} onClose={handleAnalysisDoneClose} />
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

          <FileUploader
            file={file}
            busy={busy}
            preview={!!preview}
            onFileSelect={handleFileSelect}
            onReset={resetAll}
            onSample={onSample}
            onAnalyze={onAnalyze}
          />

          {preview ? (
            <CsvPreviewComponent
              preview={preview}
              busy={busy}
              textCol={textCol}
              ratingCol={ratingCol}
              dateCol={dateCol}
              showAllPreviewCols={showAllPreviewCols}
              cellModal={cellModal}
              onTextColChange={setTextCol}
              onRatingColChange={setRatingCol}
              onDateColChange={setDateCol}
              onTogglePreviewCols={() => setShowAllPreviewCols((v) => !v)}
              onCellClick={handleCellClick}
              onCellModalClose={() => setCellModal(null)}
            />
          ) : null}

          {result?.meta?.stored ? (
            <p className="hint">
              저장됨: 나중에 &ldquo;저장된 리포트&rdquo;에서 다시 볼 수 있습니다.
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
      </div>

      {result && (
        <AnalysisResults
          result={result}
          caps={caps}
          busy={busy}
          onDownloadPdf={onDownloadPdf}
        />
      )}
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
