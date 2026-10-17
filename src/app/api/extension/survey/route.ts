import { auth } from "@clerk/nextjs/server";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { resolveExtensionTier } from "@/lib/extension_plan";
import { parseExtensionSurvey } from "@/lib/extension-survey";
import { recordFunnelEventOnce } from "@/lib/db/queries";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (await resolveExtensionTier(userId) !== "paid") {
    return Response.json({ error: "구독 연결 후 응답할 수 있습니다." }, { status: 403 });
  }
  const answer = parseExtensionSurvey(await req.json().catch(() => null));
  if (!answer) return Response.json({ error: "항목을 하나 이상 선택해 주세요." }, { status: 400 });
  // A first-party, optional response; never send free text or identity to GA4.
  // One response per account, including retries and submissions from other devices.
  const saved = await recordFunnelEventOnce("extension_customer_survey", userId,
    { ...answer, version: 1 }, `extension_survey:v1:${userId}`);
  if (saved === null) return Response.json({ error: "저장하지 못했습니다. 나중에 다시 시도해 주세요." }, { status: 503 });
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
