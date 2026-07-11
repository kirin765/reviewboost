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
