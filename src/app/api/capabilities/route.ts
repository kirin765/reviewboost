import { getCapabilities } from "@/lib/capabilities";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(getCapabilities());
}

