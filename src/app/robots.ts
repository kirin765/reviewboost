import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.APP_BASE_URL || "https://reviewboost.co.kr";
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/blog", "/help", "/pricing"],
        disallow: ["/api/", "/dashboard/", "/reset-password"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
