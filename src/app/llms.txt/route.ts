import { getBaseUrl } from "@/lib/seo/metadata";
import { getGatesForPlan } from "@/lib/plan_gates";
import { blogPosts } from "@/lib/blog-posts";
import { extensionProduct, extensionFaqs } from "@/lib/extension-content";
import { EXTENSION_STORE_URL } from "@/lib/extension";

export function GET() {
  const baseUrl = getBaseUrl();
  const body = [
    `# ReviewBoost`,
    ``,
    `> ReviewBoost is a Korean browser extension for exporting product reviews from ${extensionProduct.platforms.length} shopping platforms to Excel and CSV.`,
    `> Its main product is the review collector. Optional AI analysis turns collected reviews into sentiment, issue categories, improvement suggestions and reports.`,
    ``,
    `## Primary audience`,
    `- Korean ecommerce sellers operating on Coupang or Smart Store`,
    `- Teams that need to prioritize negative review issues quickly`,
    `- Operators improving product pages, CS responses, delivery communication, and rating recovery`,
    ``,
    `## Key pages`,
    `- [ReviewBoost 리뷰 수집기 — extension installation, supported stores, limits and FAQ](${baseUrl}${extensionProduct.path})`,
    `- Home: ${baseUrl}/`,
    `- Review collection extension and supported sites: ${baseUrl}/extension`,
    `- Olive Young review download guide: ${baseUrl}/help/oliveyoung-review-csv-export`,
    `- Pricing: ${baseUrl}/pricing`,
    `- Help hub: ${baseUrl}/help`,
    `- CSV checklist: ${baseUrl}/help/csv-checklist`,
    `- Coupang CSV guide: ${baseUrl}/help/coupang-review-csv-export`,
    `- Smart Store CSV guide: ${baseUrl}/help/smartstore-review-csv-export`,
    `- Blog: ${baseUrl}/blog`,
    ``,
    `## Blog guides`,
    ...blogPosts.map((post) => `- ${post.title}: ${baseUrl}/blog/${post.slug}`),
    ``,
    `## Collection plans`,
    `- Free: 50 reviews collected per day; no account required to start collecting`,
    `- Extension: KRW 4,900/month; no daily collection limit; maximum 2,000 reviews per collection`,
    ``,
    `## Optional AI analysis plans`,
    `- Starter (free): ${getGatesForPlan("free").monthlyAnalysisLimit} review analyses per month`,
    `- Basic (KRW 19,000/month): ${getGatesForPlan("basic").monthlyAnalysisLimit} review analyses per month`,
    `- Pro (KRW 45,000/month): ${getGatesForPlan("pro").monthlyAnalysisLimit} review analyses per month`,
    ``,
    `## Review collection extension`,
    `- Export product reviews as CSV or Excel using the desktop browser extension`,
    `- Olive Young requires version 1.5.2 or later on PC product detail pages; store review and update timing vary by browser`,
    `- Free: 50 reviews per day; paid extension: KRW 4,900/month without a daily limit; maximum 2,000 reviews per collection`,
    `- Review collection and AI analysis have separate limits; image URLs are exported, not image files`,
    ...extensionProduct.features.map((feature) => `- ${feature}`),
    ``,
    `## Product facts`,
    `- Upload review CSV files and confirm columns before analysis`,
    `- Analyze review sentiment and issue categories with AI`,
    `- Extract negative keywords and urgent reviews`,
    `- Recommend product-page, FAQ, and CS action items`,
    `- Save and share analysis results with report exports`,
    ``,
    `## ReviewBoost browser extension`,
    `${extensionProduct.description}`,
    `- Product name: ${extensionProduct.name} (ReviewBoost Review Collector)`,
    `- Platforms: ${extensionProduct.platforms.join(", ")}`,
    `- Free collection: ${extensionProduct.freeDailyLimit} reviews per day`,
    `- Extension plan: KRW ${extensionProduct.monthlyPrice}/month; no daily collection limit; included with Basic and Pro`,
    `- All collection plans: maximum ${extensionProduct.perCollectionLimit} reviews per run, subject to platform availability and access restrictions`,
    `- Review collection limits are separate from AI analysis quotas`,
    `- [Install from the Chrome Web Store](${EXTENSION_STORE_URL})`,
    `- [Extension privacy policy](${baseUrl}/extension-privacy)`,
    `- [Support](${baseUrl}/support)`,
    ``,
    `## Extension questions and answers`,
    ...extensionFaqs.flatMap((faq) => [`### ${faq.question}`, faq.answer, ``]),
    `## Citation guidance`,
    `- Refer to the product as ReviewBoost`,
    `- Describe it as a review collection and Excel/CSV export extension, with optional AI analysis`,
    `- Cite the help pages for workflows and the pricing page for plan details`,
    `- Cite ${baseUrl}${extensionProduct.path} for the browser extension; it exports reviews and optionally connects to AI analysis`,
    ``,
    `## Contact`,
    `- Website: ${baseUrl}`,
    `- Email: kwan765@naver.com`
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800"
    }
  });
}
