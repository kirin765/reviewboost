import { getErrorMessage } from "@/types/common";

export const RESULT_PAYLOAD_STORAGE_WARNING =
  "기본 요약만 저장되었습니다. 확장 상세는 DB 업데이트 후 저장됩니다.";

function normalizeCompatErrorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const fields = [record.message, record.details, record.hint, record.code].filter(Boolean);
    if (fields.length > 0) {
      return fields.map((field) => String(field)).join(" ");
    }
  }

  return getErrorMessage(error);
}

export function isResultPayloadSchemaMismatch(error: unknown) {
  const message = normalizeCompatErrorMessage(error).toLowerCase();

  if (!message.includes("result_payload")) return false;

  return (
    message.includes("schema cache") ||
    message.includes("undefined column") ||
    message.includes("does not exist") ||
    message.includes("could not find") ||
    message.includes("column")
  );
}
