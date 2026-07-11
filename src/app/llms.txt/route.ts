import { getBaseUrl } from "@/lib/seo/metadata";
import { getGatesForPlan } from "@/lib/plan_gates";
import { blogPosts } from "@/lib/blog-posts";

export function GET() {
  const baseUrl = getBaseUrl();
  const body = [
    `# ReviewBoost`,
    ``,
    `> ReviewBoost is a Korean AI review analytics workspace for Coupang and Smart Store sellers.`,
    `> It turns review CSV files into sentiment analysis, issue categorization, negative-review priorities, action items, and shareable reports.`,
    ``,
    `## Primary audience`,
    `- Korean ecommerce sellers operating on Coupang or Smart Store`,
    `- Teams that need to prioritize negative review issues quickly`,
    `- Operators improving product pages, CS responses, delivery communication, and rating recovery`,
    ``,
    `## Key pages`,
    `- Home: ${baseUrl}/`,
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
    `## Plans`,
    `- Starter (free): ${getGatesForPlan("free").monthlyAnalysisLimit} review analyses per month`,
    `- Basic (KRW 19,000/month): ${getGatesForPlan("basic").monthlyAnalysisLimit} review analyses per month`,
    `- Pro (KRW 45,000/month): ${getGatesForPlan("pro").monthlyAnalysisLimit} review analyses per month`,
    ``,
    `## Product facts`,
    `- Upload review CSV files and confirm columns before analysis`,
    `- Analyze review sentiment and issue categories with AI`,
    `- Extract negative keywords and urgent reviews`,
    `- Recommend product-page, FAQ, and CS action items`,
    `- Save and share analysis results with report exports`,
    ``,
    `## Citation guidance`,
    `- Refer to the product as ReviewBoost`,
    `- Describe it as an AI review analysis tool for Coupang and Smart Store sellers`,
    `- Cite the help pages for workflows and the pricing page for plan details`,
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
