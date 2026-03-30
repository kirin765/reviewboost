import type { Metadata } from "next";
import { getServerTranslation } from "@/lib/i18n/server";
import {
  Eyebrow,
  Panel,
  pageShellClass,
  primaryButtonClass,
  secondaryButtonClass
} from "@/components/marketing/MarketingPrimitives";

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
    <main className={`${pageShellClass} pt-12`}>
      <section className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="max-w-[620px]">
          <Eyebrow>Insights</Eyebrow>
          <h1 className="mt-4 text-5xl font-semibold tracking-[-0.07em] text-white md:text-7xl md:leading-[0.95]">
            리뷰 운영 감각을
            <br />
            더 빠르게 끌어올리는
            <br />
            실전 메모
          </h1>
          <p className="mt-6 text-base leading-8 text-[var(--color-muted)]">{t("blog.pageLead")}</p>
        </div>
        <Panel className="p-6 md:p-7">
          <div className="grid gap-4 md:grid-cols-3">
            {["리뷰 해석", "부정 대응", "상세페이지 개선"].map((item) => (
              <div key={item} className="rounded-[22px] border border-white/[0.08] bg-white/[0.03] p-4">
                <div className="text-sm font-medium text-white">{item}</div>
                <p className="mt-2 text-sm leading-7 text-[var(--color-muted)]">운영팀이 바로 적용할 수 있는 짧고 실전적인 가이드만 추렸습니다.</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {posts.map((post, index) => (
          <article key={post.slug}>
            <Panel className="flex h-full flex-col p-6">
              <div className="flex items-center justify-between">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-white/64">
                  {post.tag}
                </span>
                <span className="text-xs text-white/34">0{index + 1}</span>
              </div>
              <h2 className="mt-6 text-[28px] font-medium tracking-[-0.05em] text-white">{post.title}</h2>
              <p className="mt-4 flex-1 text-base leading-8 text-[var(--color-muted)]">{post.summary}</p>
              <div className="mt-8 text-sm text-white/72">콘텐츠 준비 중</div>
            </Panel>
          </article>
        ))}
      </section>

      <section className="mt-24">
        <Panel className="p-8 md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[700px]">
              <Eyebrow>Start free</Eyebrow>
              <h2 className="mt-4 text-4xl font-semibold tracking-[-0.06em] text-white md:text-6xl md:leading-[0.98]">{t("blog.ctaTitle")}</h2>
              <p className="mt-5 text-base leading-8 text-[var(--color-muted)]">{t("blog.ctaLead")}</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <a className={primaryButtonClass} href="/dashboard/analyze">{t("blog.ctaStart")}</a>
              <a className={secondaryButtonClass} href="/sample.csv" download>{t("blog.ctaSample")}</a>
            </div>
          </div>
        </Panel>
      </section>
    </main>
  );
}
