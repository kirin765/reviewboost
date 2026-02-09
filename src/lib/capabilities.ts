export type Capabilities = {
  supabaseConfigured: boolean;
  openaiConfigured: boolean;
};

export function getCapabilities(): Capabilities {
  const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  return { supabaseConfigured, openaiConfigured };
}

