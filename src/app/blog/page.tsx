import type { Metadata } from "next";
import Link from "next/link";
import { blogPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "블로그 - 쿠팡 리뷰 분석 & 스마트스토어 운영 팁",
  description:
    "쿠팡 리뷰 분석, 부정리뷰 대응법, 스마트스토어 리뷰 관리, 매출 올리는 법 등 이커머스 셀러를 위한 실전 가이드를 제공합니다.",
  keywords: [
    "쿠팡 리뷰 분석",
    "쿠팡 부정리뷰 대응",
    "쿠팡 매출 올리는 법",
    "스마트스토어 리뷰 관리",
    "쿠팡 별점 낮아지는 이유",
    "쿠팡 리뷰 삭제 가능",
    "쿠팡 리뷰 csv 추출"
  ],
  alternates: { canonical: "/blog" }
};

export default function BlogPage() {
  return (
    <main className="pageMain marketingPage">
      <section className="card contentPageHeader">
        <p className="sectionEyebrow">Blog</p>
        <h1>이커머스 셀러를 위한 리뷰 운영 가이드</h1>
        <p className="contentPageLead">쿠팡·스마트스토어 리뷰 관리, 부정리뷰 대응, 매출 향상 전략을 실전 중심으로 다룹니다.</p>
      </section>

      <section className="card marketingSection">
        <div className="marketingFeatureGrid">
          {blogPosts.map((post) => (
            <Link href={`/blog/${post.slug}`} className="marketingFeatureCard blogCardLink" key={post.slug}>
              <span className="badge">{post.tag}</span>
              <h3 style={{ marginTop: 8 }}>{post.title}</h3>
              <p className="muted">{post.summary}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">Start free</p>
          <h2>리뷰 분석, 지금 바로 시작해보세요.</h2>
          <p className="muted">
            CSV 업로드만으로 감성 분류, 키워드 추출, 개선 제안까지 한 번에 확인할 수 있습니다.
          </p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            무료로 분석 시작
          </a>
          <a className="btn btnOutline" href="/sample.csv" download>
            샘플 CSV 다운로드
          </a>
        </div>
      </section>
    </main>
  );
}
