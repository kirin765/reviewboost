"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { gtagEvent } from "@/lib/analytics";
import { ANALYSIS_STAGE_ORDER, type AnalysisStage } from "@/lib/analysis-stage";
import { useLocalStorage } from "@/hooks/common/useLocalStorage";
import { useModal } from "@/hooks/common/useModal";
import { getErrorMessage } from "@/types/common";
import { type DashboardAnalysisResult, analyzeCsv, downloadReportPdf, previewCsv } from "@/lib/api/analysis";
import type { CsvPreview } from "@/lib/csv";

type DashboardResult = DashboardAnalysisResult;

export type AnalysisNotice = {
  kind: "preview" | "analysis";
  title: string;
  message: string;
};

function toNotice(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  if (s.includes("로그인이 필요합니다")) return "저장된 리포트를 보려면 로그인이 필요합니다.";
  if (s.includes("업로드 파일을 읽을 수 없습니다")) return "파일을 읽지 못했어요. 다시 선택해서 시도해주세요.";
  return s;
}

type UseReviewAnalysisProps = {
  onNotice?: (value: AnalysisNotice | null) => void;
};

export function useReviewAnalysis({ onNotice }: UseReviewAnalysisProps = {}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [textCol, setTextCol] = useState("");
  const [ratingCol, setRatingCol] = useState("");
  const [dateCol, setDateCol] = useState("");
  const [showAllPreviewCols, setShowAllPreviewCols] = useState(false);
  const [notice, setNotice] = useState<AnalysisNotice | null>(null);
  const [analysisStage, setAnalysisStage] = useState<AnalysisStage>("done");
  const [lastTextCol, setLastTextCol] = useLocalStorage("reviewboost:last-text-col", "");
  const previewModal = useModal<{ col: string; value: string }>();
  const stageTimerRef = useRef<number | null>(null);

  const step = useMemo<1 | 2 | 3 | 4>(() => {
    if (result) return 4;
    if (busy && preview) return 3;
    if (preview) return 2;
    return 1;
  }, [busy, preview, result]);

  const setNoticeState = useCallback(
    (value: AnalysisNotice | null) => {
      setNotice(value);
      onNotice?.(value);
    },
    [onNotice]
  );

  const clearError = useCallback(() => setError(null), []);

  const stopStageProgress = useCallback((finalStage: AnalysisStage = "done") => {
    if (stageTimerRef.current !== null && typeof window !== "undefined") {
      window.clearInterval(stageTimerRef.current);
      stageTimerRef.current = null;
    }
    setAnalysisStage(finalStage);
  }, []);

  const startStageProgress = useCallback(() => {
    stopStageProgress("collect");

    if (typeof window === "undefined") return;

    let index = 0;
    stageTimerRef.current = window.setInterval(() => {
      index = Math.min(index + 1, ANALYSIS_STAGE_ORDER.length - 1);
      setAnalysisStage(ANALYSIS_STAGE_ORDER[index] ?? "priority");

      if (index >= ANALYSIS_STAGE_ORDER.length - 1 && stageTimerRef.current !== null) {
        window.clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
    }, 900);
  }, [stopStageProgress]);

  const normalizeError = useCallback((error: unknown) => {
    setError(toNotice(getErrorMessage(error)));
  }, []);

  const loadPreview = useCallback(
    async (nextFile: File) => {
      const nextPreview = await previewCsv(nextFile);
      setPreview(nextPreview);
      setTextCol(nextPreview.inferred.textCol ?? "");
      setRatingCol((nextPreview.inferred.ratingCol ?? "") || "");
      setDateCol((nextPreview.inferred.dateCol ?? "") || "");
      setNoticeState({
        kind: "preview",
        title: "미리보기 완료",
        message: "CSV 미리보기가 준비되었습니다. 열을 확인한 뒤 분석을 시작해 주세요."
      });
      gtagEvent("csv_upload", {
        file_name: nextFile.name,
        file_size: nextFile.size,
        rows: nextPreview.totalRows,
        columns: nextPreview.columns.length,
        header_mode: nextPreview.headerMode
      });
    },
    [setNoticeState]
  );

  const onAnalyze = useCallback(async () => {
    if (!file) return;

    setBusy(true);
    setError(null);
    setResult(null);
    setNoticeState(null);
    startStageProgress();

    try {
      if (!preview) {
        await loadPreview(file);
        stopStageProgress("done");
        return;
      }

      if (textCol) {
        setLastTextCol(textCol);
      }

      const next = await analyzeCsv({
        file,
        headerMode: preview.headerMode,
        textCol,
        ratingCol: ratingCol || undefined,
        dateCol: dateCol || undefined
      });

      setResult(next);
      stopStageProgress("done");
      setNoticeState({
        kind: "analysis",
        title: "분석 완료",
        message: "분석 결과가 준비되었습니다."
      });
      gtagEvent("analysis_complete", {
        total_reviews: next.stats.total,
        priority_score: Number(next.stats.priorityScore.toFixed(1)),
        negative_ratio: Number(next.stats.negativeRatio.toFixed(4))
      });
    } catch (error: unknown) {
      stopStageProgress("done");
      normalizeError(error);
      setError(toNotice(getErrorMessage(error)));
      setNoticeState(null);
    } finally {
      setBusy(false);
    }
  }, [dateCol, file, loadPreview, normalizeError, preview, ratingCol, setLastTextCol, setNoticeState, startStageProgress, stopStageProgress, textCol]);

  const onSample = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setNoticeState(null);
    startStageProgress();
    try {
      const res = await fetch("/sample.csv", { cache: "no-store" });
      if (!res.ok) {
        throw new Error("샘플 CSV를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      }

      const blob = await res.blob();
      const f = new File([blob], "sample.csv", { type: "text/csv" });
      setFile(f);
      setPreview(null);
      setShowAllPreviewCols(false);
      setTextCol(lastTextCol);
      setRatingCol("");
      setDateCol("");
      await loadPreview(f);
      stopStageProgress("done");
      setNoticeState({
        kind: "preview",
        title: "미리보기 완료",
        message: "샘플 CSV 미리보기가 준비되었습니다. 열을 확인한 뒤 분석을 시작해 주세요."
      });
    } catch (error: unknown) {
      stopStageProgress("done");
      normalizeError(error);
    } finally {
      setBusy(false);
    }
  }, [lastTextCol, loadPreview, normalizeError, setNoticeState, startStageProgress, stopStageProgress]);

  const onSampleAndAnalyze = useCallback(async () => {
    await onSample();
    await onAnalyze();
  }, [onAnalyze, onSample]);

  const onReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setNoticeState(null);
    setShowAllPreviewCols(false);
    setTextCol(lastTextCol);
    setRatingCol("");
    setDateCol("");
    stopStageProgress("done");
  }, [lastTextCol, setNoticeState, stopStageProgress]);

  const onBackToUpload = useCallback(() => {
    setPreview(null);
    setResult(null);
    setError(null);
    setNoticeState(null);
    setShowAllPreviewCols(false);
    stopStageProgress("done");
  }, [setNoticeState, stopStageProgress]);

  useEffect(() => () => stopStageProgress("done"), [stopStageProgress]);

  const onDownloadPdf = useCallback(async (): Promise<Blob | null> => {
    if (!result) return null;

    setBusy(true);
    setError(null);
    try {
      const blob = await downloadReportPdf(result);
      gtagEvent("report_download", {
        file_name: `reviewboost-report-${Date.now()}.pdf`,
        total_reviews: result.stats.total
      });
      return blob;
    } catch (error: unknown) {
      setError(toNotice(getErrorMessage(error)));
      return null;
    } finally {
      setBusy(false);
    }
  }, [result]);

  const onCellClick = useCallback(
    (col: string, value: string) => {
      previewModal.show({ col, value });
    },
    [previewModal]
  );

  return {
    state: {
      file,
      busy,
      error,
      preview,
      result,
      step,
      textCol,
      ratingCol,
      dateCol,
      showAllPreviewCols,
      notice,
      analysisStage,
      isBusy: busy
    },
    actions: {
      setFile,
      setShowAllPreviewCols,
      setTextCol,
      setRatingCol,
      setDateCol,
      clearError,
      onAnalyze,
      onReset,
      onBackToUpload,
      onSample,
      onSampleAndAnalyze,
      onDownloadPdf,
      onCellClick,
      closeCellModal: previewModal.hide
    },
    modal: previewModal,
    previewModal
  };
}
