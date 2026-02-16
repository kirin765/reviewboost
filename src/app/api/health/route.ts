import { getCapabilitiesBase } from "@/lib/capabilities";

export const runtime = "nodejs";

export async function GET() {
  const base = getCapabilitiesBase();
  
  // Basic health check - returns status of external services
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    services: {
      supabase: base.supabaseConfigured ? "configured" : "not_configured",
      openai: base.openaiConfigured ? "configured" : "not_configured"
    }
  };

  return Response.json(health);
}
