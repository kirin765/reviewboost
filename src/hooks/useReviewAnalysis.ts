"use client";

import { useCallback, useMemo, useState } from "react";
import { gtagEvent } from "@/lib/analytics";
import { useLocalStorage } from "@/hooks/common/useLocalStorage";
import { useModal } from "@/hooks/common/useModal";
import { getErrorMessage } from "@/types/common";
import { type DashboardAnalysisResult, analyzeCsv, downloadReportPdf, previewCsv } from "@/lib/api/analysis";
import type { CsvPreview } from "@/lib/csv";

type DashboardResult = DashboardAnalysisResult;

function toNotice(raw: string): string {
  const s = String(raw || "").trim();
  if (!s) return "처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  if (s.includes("로그인이 필요합니다")) return "저장된 리포트를 보려면 로그인이 필요합니다.";
  if (s.includes("업로드 파일을 읽을 수 없습니다")) return "파일을 읽지 못했어요. 다시 선택해서 시도해주세요.";
  return s;
}

type UseReviewAnalysisProps = {
  onNotice?: (value: string | null) => void;
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
  const [notice, setNotice] = useState<string | null>(null);
  const [lastTextCol, setLastTextCol] = useLocalStorage("reviewboost:last-text-col", "");
  const previewModal = useModal<{ col: string; value: string }>();

  const step = useMemo(() => {
    if (!file) return 1;
    if (!preview) return 2;
    if (!result) return 3;
    return 4;
  }, [file, preview, result]);

  const setNoticeState = useCallback(
    (value: string | null) => {
      setNotice(value);
      onNotice?.(value);
    },
    [onNotice]
  );

  const clearError = useCallback(() => setError(null), []);

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
      setNoticeState("미리보기가 준비되었습니다. 다음은 분석을 진행해 주세요.");
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

    try {
      if (!preview) {
        await loadPreview(file);
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
      setNoticeState("분석이 완료되었습니다.");
      gtagEvent("analysis_complete", {
        total_reviews: next.stats.total,
        priority_score: Number(next.stats.priorityScore.toFixed(1)),
        negative_ratio: Number(next.stats.negativeRatio.toFixed(4))
      });
    } catch (error: unknown) {
      normalizeError(error);
      setError(toNotice(getErrorMessage(error)));
      setNoticeState(null);
    } finally {
      setBusy(false);
    }
  }, [dateCol, file, loadPreview, normalizeError, preview, ratingCol, setLastTextCol, setNoticeState, textCol]);

  const onSample = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setNoticeState(null);
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
      setNoticeState("샘플 파일이 업로드되어 미리보기가 준비되었습니다.");
    } catch (error: unknown) {
      normalizeError(error);
    } finally {
      setBusy(false);
    }
  }, [lastTextCol, loadPreview, normalizeError, setNoticeState]);

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
  }, [lastTextCol, setNoticeState]);

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
