/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "http://100.64.78.128:3001",
    "https://100.64.78.128:3001",
    "http://100.91.6.89:3001",
    "https://100.91.6.89:3001"
  ],
  experimental: {
    // Keep PDFKit as external in server bundle so it resolves assets from node_modules.
    serverComponentsExternalPackages: ["pdfkit"],
    // Ensure AFM data and project fonts are available in production tracing outputs.
    outputFileTracingIncludes: {
      "/*": ["./node_modules/pdfkit/js/data/**/*", "./assets/fonts/**/*"]
    }
  }
};

module.exports = nextConfig;
