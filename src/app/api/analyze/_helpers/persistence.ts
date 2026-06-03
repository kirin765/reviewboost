import { runAnalysisPipeline } from "@/lib/analysis_pipeline";
import { createStoredAnalysisPayload } from "@/lib/saved-analysis";
import { insertAnalysisForUser, insertReviewsForAnalysis } from "@/lib/db/queries";

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

export interface PersistAndRespondInput {
  userId: string;
  clientIp: string | null;
  filename: string | null;
  payload: AnalysisPayload;
  classified: import("@/lib/types").ClassifiedReview[];
  storageStatus: StorageStatus;
  clientLabel: string;
}

/**
 * Persists an analysis via Drizzle (Neon).
 * Mutates `storageStatus` in place.
 * Returns a `Response` on success, or `null` if no analysisId was returned.
 * Throws on insert errors so the caller's catch block can handle them.
 */
export async function executePersistAndRespond({
  userId,
  clientIp,
  filename,
  payload,
  classified,
  storageStatus,
  clientLabel
}: PersistAndRespondInput): Promise<Response | null> {
  const analysisId = await insertAnalysisForUser({
    userId,
    clientIp,
    inputFilename: filename,
    stats: payload.stats,
    suggestions: payload.suggestions,
    resultPayload: createStoredAnalysisPayload(payload),
    priorityScore: payload.stats.priorityScore
  });

  if (!analysisId) {
    storageStatus.error = `analyses_insert_${clientLabel}_no_id`;
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
