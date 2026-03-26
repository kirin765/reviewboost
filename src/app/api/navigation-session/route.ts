import { getNavigationSessionState } from "@/lib/navigation_session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getNavigationSessionState();

  return Response.json(session, {
    headers: {
      "cache-control": "private, no-store, max-age=0, must-revalidate"
    }
  });
}
