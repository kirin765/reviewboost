import { runAnalysisPipeline } from "@/lib/analysis_pipeline";
import { createStoredAnalysisPayload } from "@/lib/saved-analysis";
import { isResultPayloadSchemaMismatch, RESULT_PAYLOAD_STORAGE_WARNING } from "@/lib/result-payload-compat";

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

export function buildAnalysisInsertRecord({
  userId,
  clientIp,
  filename,
  payload,
  includeResultPayload
}: {
  userId: string;
  clientIp: string | null;
  filename: string | null;
  payload: AnalysisPayload;
  includeResultPayload: boolean;
}) {
  return {
    user_id: userId,
    client_ip: clientIp,
    input_filename: filename,
    stats: payload.stats,
    suggestions: payload.suggestions,
    priority_score: payload.stats.priorityScore,
    ...(includeResultPayload ? { result_payload: createStoredAnalysisPayload(payload) } : {})
  };
}

export async function insertAnalysisWithCompat({
  client,
  userId,
  clientIp,
  filename,
  payload
}: {
  client: { from: (table: string) => any };
  userId: string;
  clientIp: string | null;
  filename: string | null;
  payload: AnalysisPayload;
}) {
  const firstAttempt = await client
    .from("analyses")
    .insert(buildAnalysisInsertRecord({ userId, clientIp, filename, payload, includeResultPayload: true }))
    .select("id")
    .single();

  if (!firstAttempt.error) {
    return {
      data: firstAttempt.data,
      error: null,
      usedCompatFallback: false
    };
  }

  if (!isResultPayloadSchemaMismatch(firstAttempt.error)) {
    return {
      data: null,
      error: firstAttempt.error,
      usedCompatFallback: false
    };
  }

  const secondAttempt = await client
    .from("analyses")
    .insert(buildAnalysisInsertRecord({ userId, clientIp, filename, payload, includeResultPayload: false }))
    .select("id")
    .single();

  return {
    data: secondAttempt.data,
    error: secondAttempt.error,
    usedCompatFallback: true
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
 * Attempts to persist an analysis via the given Supabase client.
 * Mutates `storageStatus` in place.
 * Returns a `Response` on success, or `null` if no analysisId was returned
 * (caller should continue to the next fallback path).
 * Throws on Supabase insert errors so the caller's catch block can handle them.
 */
export async function executePersistAndRespond(
  client: { from: (table: string) => any },
  { userId, clientIp, filename, payload, classified, storageStatus, clientLabel }: PersistAndRespondInput
): Promise<Response | null> {
  const insertAnalysis = await insertAnalysisWithCompat({
    client,
    userId,
    clientIp,
    filename,
    payload
  });

  if (insertAnalysis.usedCompatFallback) {
    storageStatus.warning = RESULT_PAYLOAD_STORAGE_WARNING;
    storageStatus.step = `analyses_insert_${clientLabel}_compat`;
  }

  if (insertAnalysis.error) {
    const step = insertAnalysis.usedCompatFallback
      ? `analyses_insert_${clientLabel}_compat_failed`
      : `analyses_insert_${clientLabel}_failed`;
    storageStatus.error = toStorageError(
      `${step}: ${insertAnalysis.error.message ?? JSON.stringify(insertAnalysis.error)}`
    );
    throw new Error(storageStatus.error);
  }

  const analysisId = insertAnalysis.data?.id as string | undefined;
  if (!analysisId) {
    storageStatus.error = `analyses_insert_${clientLabel}_no_id`;
    return null;
  }

  const reviews = classified.slice(0, 5000).map((r) => ({
    analysis_id: analysisId,
    rating: r.rating,
    text: r.text,
    sentiment: r.sentiment,
    category: r.category,
    reviewed_at: r.reviewedAt ?? null
  }));

  if (reviews.length) {
    storageStatus.step = `reviews_insert_${clientLabel}`;
    const insertReviews = await client.from("reviews").insert(reviews);
    if (insertReviews.error) {
      storageStatus.error = toStorageError(
        `reviews_insert_${clientLabel}_failed: ${insertReviews.error.message ?? JSON.stringify(insertReviews.error)}`
      );
      throw new Error(storageStatus.error);
    }
  }

  storageStatus.success = true;
  storageStatus.analysisId = analysisId;
  storageStatus.error = null;

  return Response.json({
    ...payload,
    meta: buildStorageMeta(payload.meta, storageStatus)
  });
}

export { RESULT_PAYLOAD_STORAGE_WARNING };
