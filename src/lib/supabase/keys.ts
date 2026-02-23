type SupabaseDeployment = "DEV" | "PROD";

export function getSupabaseDeployment() {
  const appEnv = (process.env.APP_ENV || process.env.NODE_ENV || "").toLowerCase();
  return appEnv === "production" || appEnv === "prod" ? "PROD" : "DEV";
}

function resolveEnvValue(keys: string[], deployment: SupabaseDeployment) {
  const candidates = [
    ...keys.map((key) => `${key}_${deployment}`),
    ...keys
  ];

  for (const envKey of candidates) {
    const value = process.env[envKey];
    if (value) return value;
  }
  return "";
}

export function getSupabaseUrl() {
  const deployment = getSupabaseDeployment();
  const url = resolveEnvValue(["SUPABASE_URL"], deployment);
  if (!url) throw new Error("SUPABASE_URL is not set");
  return url;
}

export function getSupabaseAnonKey() {
  const deployment = getSupabaseDeployment();
  const key = resolveEnvValue(
    ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"],
    deployment
  );
  if (!key) throw new Error("SUPABASE_ANON_KEY is not set");
  return key;
}
