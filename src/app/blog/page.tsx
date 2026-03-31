import type { Metadata } from "next";
import StructuredData from "@/components/seo/StructuredData";
import { MarketingHubPage } from "@/components/marketing/MarketingPages";
import { blogPosts } from "@/lib/blog-posts";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createCollectionPageStructuredData } from "@/lib/seo/structured-data";

const blogRecord = getRequiredSeoPageRecord("/blog");

export const metadata: Metadata = generatePageMetadata(blogRecord);

export default function BlogPage() {
  const cards = blogPosts.map((post) => ({
    href: `/blog/${post.slug}`,
    title: post.title,
    description: post.summary,
    tag: post.tag
  }));

  return (
    <>
      <StructuredData
        data={createCollectionPageStructuredData(
          blogRecord,
          cards.map((card) => ({ name: card.title, path: card.href }))
        )}
      />
      <MarketingHubPage
        eyebrow="Blog"
        title="이커머스 셀러를 위한 리뷰 운영 가이드"
        lead="쿠팡 리뷰 분석, 부정리뷰 대응, 스마트스토어 리뷰 관리, 매출 향상 전략을 실전 중심으로 정리했습니다."
        cards={cards}
        highlights={["쿠팡", "스마트스토어", "부정리뷰 대응", "매출 개선"]}
        ctaTitle="글에서 본 내용을 실제 리포트로 바로 확인해보세요."
        ctaLead="샘플 CSV나 실제 데이터를 올리면 블로그에서 설명한 흐름을 바로 체험할 수 있습니다."
      />
    </>
  );
}
