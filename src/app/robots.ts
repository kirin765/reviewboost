import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_BASE_URL || "https://reviewboost.co.kr";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/help", "/pricing", "/login", "/signup", "/term", "/privacy"],
        disallow: ["/api/", "/dashboard/", "/reset-password", "/forgot-password"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
