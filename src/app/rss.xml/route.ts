import { blogPosts, type ContentBlock } from "@/lib/blog-posts";
import { getBaseUrl } from "@/lib/seo/metadata";
import { getSeoPageRecordByPath } from "@/lib/seo/page-registry";

export const dynamic = "force-static";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeXml(s: string): string {
  return escapeHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function blockToHtml(block: ContentBlock): string {
  switch (block.type) {
    case "h2":
      return `<h2>${escapeHtml(block.text)}</h2>`;
    case "h3":
      return `<h3>${escapeHtml(block.text)}</h3>`;
    case "p":
      return `<p>${escapeHtml(block.text)}</p>`;
    case "callout":
      return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
    case "ul":
      return `<ul>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${block.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ol>`;
  }
}

// Naver wants the full article body inside the RSS, not just an excerpt.
function renderBody(content: ContentBlock[]): string {
  return content.map(blockToHtml).join("");
}

export function GET() {
  const base = getBaseUrl();
  const channelTitle = "ReviewBoost 블로그 — 쿠팡·스마트스토어 리뷰 분석 가이드";
  const channelDesc =
    "쿠팡·스마트스토어 셀러를 위한 AI 리뷰 분석 활용법과 운영 가이드 모음.";
  const lastBuildDate = new Date().toUTCString();

  const items = blogPosts
    .map((post) => {
      const url = `${base}/blog/${post.slug}`;
      const record = getSeoPageRecordByPath(`/blog/${post.slug}`);
      const pubDate = new Date(record?.updatedAt ?? "2026-03-31").toUTCString();
      const fullBody = renderBody(post.content);
      return `<item>
<title>${escapeXml(post.title)}</title>
<link>${url}</link>
<guid isPermaLink="true">${url}</guid>
<category>${escapeXml(post.tag)}</category>
<pubDate>${pubDate}</pubDate>
<description>${escapeXml(post.summary)}</description>
<content:encoded><![CDATA[${fullBody}]]></content:encoded>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel>
<title>${escapeXml(channelTitle)}</title>
<link>${base}/blog</link>
<atom:link href="${base}/rss.xml" rel="self" type="application/rss+xml" />
<description>${escapeXml(channelDesc)}</description>
<language>ko-KR</language>
<lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
