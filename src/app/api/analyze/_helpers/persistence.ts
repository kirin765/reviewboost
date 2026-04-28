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

export { RESULT_PAYLOAD_STORAGE_WARNING };
