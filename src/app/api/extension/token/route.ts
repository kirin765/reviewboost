import { auth } from "@clerk/nextjs/server";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";
import { isExtensionTokenConfigured, issueExtensionToken } from "@/lib/extension_token";
import { recordFunnelEvent } from "@/lib/db/queries";

export const runtime = "nodejs";

/**
 * 익스텐션 연결 페이지(/extension-connect, 동일 출처)에서 호출.
 * 로그인한 사용자에게 장수명 익스텐션 토큰을 발급한다.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  if (!isExtensionTokenConfigured()) {
    return Response.json({ error: "인증 설정이 완료되지 않았습니다." }, { status: 503 });
  }

  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const issued = issueExtensionToken(userId);
  if (!issued) {
    return Response.json({ error: "토큰 발급에 실패했습니다." }, { status: 500 });
  }

  await recordFunnelEvent("extension_token_issued", userId, { source: "extension_connect" });

  return Response.json(
    { token: issued.token, expiresAt: issued.expiresAt },
    { headers: { "cache-control": "no-store" } }
  );
}
