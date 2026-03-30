import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonStyles } from "@/components/ui/Button";
import { SectionHeader, ShellContainer, Surface } from "@/components/ui/Primitives";
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
    <main className="pageMain pb-8 pt-8 md:pt-12">
      <ShellContainer className="space-y-6">
        <Surface className="px-6 py-7 md:px-8 md:py-9">
          <SectionHeader eyebrow="Blog" title="이커머스 셀러를 위한 리뷰 운영 가이드" description="쿠팡·스마트스토어 리뷰 관리, 부정리뷰 대응, 매출 향상 전략을 실전 중심으로 다룹니다." />
        </Surface>

        <div className="grid gap-4 lg:grid-cols-2">
          {blogPosts.map((post) => (
            <Link
              href={`/blog/${post.slug}`}
              className="rounded-[16px] border border-[color:var(--rb-border)] bg-[rgba(255,255,255,0.02)] px-6 py-6 shadow-[0_20px_44px_rgba(0,0,0,0.2)] transition hover:border-[color:rgba(95,198,183,0.22)] hover:bg-[rgba(255,255,255,0.03)]"
              key={post.slug}
            >
              <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-accent)]">{post.tag}</span>
              <h2 className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">{post.title}</h2>
              <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">{post.summary}</p>
            </Link>
          ))}
        </div>

        <Surface className="px-6 py-6 md:px-8">
          <SectionHeader eyebrow="Start free" title="리뷰 분석, 지금 바로 시작해보세요." description="CSV 업로드만으로 감성 분류, 키워드 추출, 개선 제안까지 한 번에 확인할 수 있습니다." />
          <div className="mt-6 flex flex-wrap gap-3">
            <a className={buttonStyles({ variant: "primary" })} href="/dashboard">무료로 분석 시작</a>
            <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>샘플 CSV 다운로드</a>
          </div>
        </Surface>
      </ShellContainer>
    </main>
  );
}
