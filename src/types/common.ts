export type Nullable<T> = T | null;

export type AsyncResult<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: unknown };

export type JsonObject = Record<string, unknown>;

export function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function isErrorWithMessage(value: unknown): value is Error {
  return value instanceof Error && typeof value.message === "string";
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
