/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "http://100.64.78.128:3001",
    "https://100.64.78.128:3001",
    "http://100.91.6.89:3001",
    "https://100.91.6.89:3001"
  ],
  serverExternalPackages: ["pdfkit"],
  // Next 15 streams <title>/meta into the body for non-listed UAs, so HTML-only crawlers
  // (no JS) read an empty <head>. This is Next's default html-limited-bot list (Yeti, Bing,
  // social, Google-*) extended with AI answer engines + Daum/Kakao so they get a blocking
  // render with metadata in <head> instead of streamed-into-body. Keep the default prefix in
  // sync with next/dist/shared/lib/router/utils/html-bots.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|GPTBot|OAI-SearchBot|ChatGPT-User|PerplexityBot|Perplexity-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|cohere-ai|Amazonbot|Bytespider|Meta-ExternalAgent|CCBot|Daum|Kakao|YouBot|Diffbot/i,
  // Ensure AFM data and project fonts are available in production tracing outputs.
  outputFileTracingIncludes: {
    "/*": ["./node_modules/pdfkit/js/data/**/*", "./assets/fonts/**/*"]
  }
};

module.exports = nextConfig;
