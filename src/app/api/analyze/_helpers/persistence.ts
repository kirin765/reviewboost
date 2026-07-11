import { runAnalysisPipeline } from "@/lib/analysis_pipeline";
import { createStoredAnalysisPayload } from "@/lib/saved-analysis";
import { finalizeAnalysisForUser, insertReviewsForAnalysis } from "@/lib/db/queries";

type AnalysisPayload = Awaited<ReturnType<typeof runAnalysisPipeline>>["payload"];

type StorageStatus = {
  attempted: boolean;
  success: boolean;
  analysisId?: string;
  step?: string;
  error: string | null;
  warning?: string | null;
};

export function toStorageError(message?: string | null) {
  return message && String(message).trim() ? String(message).trim() : "저장에 실패했습니다.";
}

export function buildStorageMeta(base: AnalysisPayload["meta"], storage: StorageStatus) {
  return {
    ...base,
    filename: base.filename,
    stored: storage.success,
    analysisId: storage.analysisId,
    truncated: base.truncated,
    storageAttempted: storage.attempted,
    storageError: storage.success ? null : storage.error,
    storageWarning: storage.warning ?? null,
    storageStep: storage.step ?? null
  };
}

export type { StorageStatus };

export interface FinalizeAndRespondInput {
  userId: string;
  analysisId: string;
  filename: string | null;
  payload: AnalysisPayload;
  classified: import("@/lib/types").ClassifiedReview[];
  storageStatus: StorageStatus;
  clientLabel: string;
}

/**
 * Finalizes a previously reserved analysis row via Drizzle (Neon) with the real
 * results, then stores the classified reviews.
 * Mutates `storageStatus` in place.
 * Returns a `Response` on success, or `null` if the reserved row was missing.
 * Throws on write errors so the caller's catch block can handle them.
 */
export async function finalizePersistAndRespond({
  userId,
  analysisId,
  filename,
  payload,
  classified,
  storageStatus,
  clientLabel
}: FinalizeAndRespondInput): Promise<Response | null> {
  const finalized = await finalizeAnalysisForUser(analysisId, userId, {
    inputFilename: filename,
    stats: payload.stats,
    suggestions: payload.suggestions,
    resultPayload: createStoredAnalysisPayload(payload),
    priorityScore: payload.stats.priorityScore
  });

  if (!finalized) {
    storageStatus.error = `analyses_finalize_${clientLabel}_missing`;
    return null;
  }

  storageStatus.step = `reviews_insert_${clientLabel}`;
  await insertReviewsForAnalysis(
    analysisId,
    classified.slice(0, 5000).map((r) => ({
      rating: r.rating,
      text: r.text,
      sentiment: r.sentiment,
      category: r.category,
      reviewedAt: r.reviewedAt ?? null
    }))
  );

  storageStatus.success = true;
  storageStatus.analysisId = analysisId;
  storageStatus.error = null;

  return Response.json({
    ...payload,
    meta: buildStorageMeta(payload.meta, storageStatus)
  });
}
