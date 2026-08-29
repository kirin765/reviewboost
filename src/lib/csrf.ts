export function isSameOriginRequest(req: Request): boolean {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  const expectedOrigin = `${proto}://${host}`;

  const origin = req.headers.get("origin");
  if (origin) return origin === expectedOrigin;

  // Fallback for environments/proxies where Origin may be omitted.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin === expectedOrigin;
    } catch {
      return false;
    }
  }

  // Neither Origin nor Referer present: fail closed. Browser POST fetches always
  // send Origin, so a request missing both is not a same-origin app request.
  return false;
}

export function csrfErrorResponse() {
  return Response.json({ error: "invalid origin" }, { status: 403 });
}

/**
 * 유효한 Chrome 확장 프로그램 오리진( chrome-extension://<id:[a-p]{32}> ) 이면
 * 그 오리진 문자열을, 아니면 null 을 돌려준다.
 * 브라우저가 Origin 헤더를 강제하므로 일반 웹 페이지는 이 값을 위조할 수 없다 —
 * 확장 팝업(예: CS 문의 폼)의 동일 오리진 요청만 허용하는 용도.
 */
export function extensionOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  if (!origin) return null;
  return /^chrome-extension:\/\/[a-p]{32}$/.test(origin) ? origin : null;
}

/** 확장 오리진 요청 응답에 CORS 헤더를 얹는다 (브라우저가 프리플라이트·응답 검증에 사용). */
export function withCorsHeaders(res: Response, origin: string | null): Response {
  if (!origin) return res;
  const headers = new Headers(res.headers);
  headers.set("access-control-allow-origin", origin);
  headers.set("access-control-allow-methods", "POST, OPTIONS");
  headers.set("access-control-allow-headers", "content-type");
  headers.set("vary", "Origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}
