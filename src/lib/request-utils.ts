/**
 * Extract client IP address from request headers.
 * Handles proxies and load balancers (x-forwarded-for, etc.)
 */
export function getClientIp(req: Request): string | null {
  const headers = req.headers;

  // Check x-forwarded-for header (common for proxies/load balancers)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one (original client)
    return forwarded.split(",")[0].trim();
  }

  // Check x-real-ip header (commonly set by nginx, etc.)
  const realIp = headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Check cf-connecting-ip (Cloudflare)
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp) {
    return cfIp.trim();
  }

  return null;
}
