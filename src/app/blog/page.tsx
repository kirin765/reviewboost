import type { Metadata } from "next";
import { getServerTranslation } from "@/lib/i18n/server";

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

export default async function BlogPage() {
  const { t } = await getServerTranslation();

  const posts = [
    { slug: "coupang-review-analysis", title: t("blog.post1Title"), summary: t("blog.post1Summary"), tag: t("blog.post1Tag") },
    { slug: "coupang-negative-review-response", title: t("blog.post2Title"), summary: t("blog.post2Summary"), tag: t("blog.post2Tag") },
    { slug: "smartstore-review-management", title: t("blog.post3Title"), summary: t("blog.post3Summary"), tag: t("blog.post3Tag") },
    { slug: "coupang-rating-drop-reasons", title: t("blog.post4Title"), summary: t("blog.post4Summary"), tag: t("blog.post4Tag") },
    { slug: "coupang-review-csv-export", title: t("blog.post5Title"), summary: t("blog.post5Summary"), tag: t("blog.post5Tag") },
    { slug: "increase-coupang-sales-with-reviews", title: t("blog.post6Title"), summary: t("blog.post6Summary"), tag: t("blog.post6Tag") }
  ];

  return (
    <main className="pageMain marketingPage">
      <section className="card marketingSection">
        <div className="marketingSectionIntro">
          <p className="sectionEyebrow">Blog</p>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)" }}>
            {t("blog.pageTitle")}
          </h1>
          <p className="muted">
            {t("blog.pageLead")}
          </p>
        </div>
        <div className="marketingFeatureGrid">
          {posts.map((post) => (
            <article className="marketingFeatureCard" key={post.slug}>
              <span className="badge">{post.tag}</span>
              <h3 style={{ marginTop: 8 }}>{post.title}</h3>
              <p className="muted">{post.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">Start free</p>
          <h2>{t("blog.ctaTitle")}</h2>
          <p className="muted">
            {t("blog.ctaLead")}
          </p>
        </div>
        <div className="actionRow">
          <a className="btn btnPrimary" href="/dashboard">
            {t("blog.ctaStart")}
          </a>
          <a className="btn btnOutline" href="/sample.csv" download>
            {t("blog.ctaSample")}
          </a>
        </div>
      </section>
    </main>
  );
}
