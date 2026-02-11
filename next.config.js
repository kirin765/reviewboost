/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
