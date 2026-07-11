import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import StructuredData from "@/components/seo/StructuredData";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer } from "@/components/ui/Primitives";
import { blogPosts } from "@/lib/blog-posts";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getRequiredSeoPageRecord } from "@/lib/seo/page-registry";
import { createCollectionPageStructuredData } from "@/lib/seo/structured-data";

const blogRecord = getRequiredSeoPageRecord("/blog");

export const metadata: Metadata = generatePageMetadata(blogRecord);

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <main className="pageMain pb-8 pt-8 md:pt-12">
      <StructuredData
        data={createCollectionPageStructuredData(
          blogRecord,
          blogPosts.map((post) => ({ name: post.title, path: `/blog/${post.slug}` }))
        )}
      />
      <ShellContainer className="space-y-10">
        <section className="space-y-8">
          <div className="grid gap-6 border-b border-[color:#e6e8f2] pb-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(280px,420px)]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">Blog</p>
              <h1 className="mt-4 max-w-3xl text-[clamp(2.6rem,5vw,4.8rem)] font-semibold leading-[0.96] tracking-[-0.07em] text-[var(--rb-fg)]">
                이커머스 셀러를 위한 리뷰 운영 가이드
              </h1>
            </div>
            <p className="text-base leading-8 text-[var(--rb-muted-strong)]">
              쿠팡과 스마트스토어 리뷰 관리, 부정 리뷰 대응, 매출 향상 전략을 실전 중심으로 다룹니다.
            </p>
          </div>

          {featured ? (
            <Link
              href={`/blog/${featured.slug}`}
              className="block rounded-[30px] border border-[color:#e6e8f2] bg-white px-5 py-7 shadow-[0_10px_30px_rgba(31,37,64,0.08)] transition hover:border-[color:rgba(91,92,234,0.22)] md:px-8 md:py-9"
            >
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-accent)]">{featured.tag}</span>
              <h2 className="mt-4 max-w-4xl text-[clamp(2rem,4vw,3.6rem)] font-semibold tracking-[-0.06em] text-[var(--rb-fg)]">{featured.title}</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--rb-muted-strong)]">{featured.summary}</p>
            </Link>
          ) : null}
        </section>

        <section className="border-t border-[color:#e6e8f2]">
          {rest.map((post) => (
            <Link
              href={`/blog/${post.slug}`}
              className="grid gap-4 border-b border-[color:#e6e8f2] py-6 transition hover:bg-white md:grid-cols-[180px_minmax(0,1fr)_40px] md:items-start"
              key={post.slug}
            >
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-accent)]">{post.tag}</span>
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{post.title}</h2>
                <p className="mt-3 text-sm leading-7 text-[var(--rb-muted-strong)]">{post.summary}</p>
              </div>
              <span className="text-right text-2xl text-[var(--rb-muted)]" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </section>

        <section className="rounded-[30px] border border-[color:#e6e8f2] bg-white px-5 py-7 md:px-8 md:py-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--rb-muted)]">Start free</p>
          <h2 className="mt-4 max-w-3xl text-[clamp(2rem,4vw,3.4rem)] font-semibold leading-[0.98] tracking-[-0.05em] text-[var(--rb-fg)]">
            리뷰 분석, 지금 바로 시작해보세요.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--rb-muted-strong)]">
            CSV 업로드만으로 감성 분류, 키워드 추출, 개선 제안까지 한 번에 확인할 수 있습니다.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className={buttonStyles({ variant: "primary" })} href="/dashboard/analyze">
              무료로 분석 시작
            </a>
            <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>
              샘플 CSV 다운로드
            </a>
          </div>
        </section>
      </ShellContainer>
    </main>
  );
}
