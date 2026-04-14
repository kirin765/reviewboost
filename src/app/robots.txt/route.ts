import { getBaseUrl } from "@/lib/seo/metadata";

export function GET() {
  const baseUrl = getBaseUrl();
  const body = [
    `User-agent: *`,
    `Allow: /`,
    `Allow: /llms.txt`,
    `Disallow: /api/`,
    `Disallow: /dashboard/`,
    `Disallow: /auth/`,
    `Disallow: /login`,
    `Disallow: /signup`,
    `Disallow: /reset-password`,
    `Sitemap: ${baseUrl}/sitemap.xml`
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600"
    }
  });
}
