/** Flat, bounded metadata only. Never copy raw query strings, emails or auth tokens. */
export function sanitizeCheckoutAttribution(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const value = input as Record<string, unknown>;
  const result: Record<string, string> = {};
  for (const key of ["ga_client_id", "ga_session_id", "acquisition_source", "acquisition_medium", "acquisition_campaign"]) {
    const text = typeof value[key] === "string" ? value[key].trim() : "";
    const valid = key === "ga_client_id" ? /^\d{1,20}\.\d{1,20}$/.test(text)
      : key === "ga_session_id" ? /^\d{1,20}$/.test(text)
      : /^[\p{L}\p{N}_.() /-]{1,100}$/u.test(text);
    if (valid) result[key] = text;
  }
  return result;
}
