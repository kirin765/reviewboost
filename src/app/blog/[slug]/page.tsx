import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer, Surface } from "@/components/ui/Primitives";
import { blogPosts, type ContentBlock } from "@/lib/blog-posts";

type BlogDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata(props: BlogDetailPageProps): Promise<Metadata> {
  const { slug } = await props.params;
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    return {
      title: "블로그 - ReviewBoost",
      alternates: { canonical: "/blog" }
    };
  }

  return {
    title: `${post.title} - ReviewBoost 블로그`,
    description: post.summary,
    alternates: { canonical: `/blog/${post.slug}` }
  };
}

function getContentBlockKey(block: ContentBlock, index: number) {
  if ("text" in block) {
    return `${block.type}-${block.text}-${index}`;
  }

  return `${block.type}-${block.items.join("|")}-${index}`;
}

function renderContentBlock(block: ContentBlock, key: string) {
  switch (block.type) {
    case "h2":
      return <h2 key={key}>{block.text}</h2>;
    case "h3":
      return <h3 key={key}>{block.text}</h3>;
    case "p":
      return <p key={key}>{block.text}</p>;
    case "ul":
      return (
        <ul key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key}>
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div className="blogCallout" key={key}>
          {block.text}
        </div>
      );
    default:
      return null;
  }
}

export default async function BlogDetailPage(props: BlogDetailPageProps) {
  const { slug } = await props.params;
  const post = blogPosts.find((item) => item.slug === slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="pageMain pb-8 pt-8 md:pt-12">
      <ShellContainer className="max-w-[980px] space-y-6">
        <nav className="text-sm text-[var(--rb-muted-strong)]">
          <Link href="/blog">← 블로그</Link>
        </nav>

        <Surface className="px-6 py-7 md:px-8 md:py-9">
          <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-accent)]">{post.tag}</span>
          <h1 className="mt-4 text-[clamp(2.2rem,4vw,4rem)] font-semibold tracking-[-0.06em] text-[var(--rb-fg)]">{post.title}</h1>
          <p className="mt-5 text-base leading-8 text-[var(--rb-muted-strong)]">{post.summary}</p>
        </Surface>

        <Surface className="rb-prose px-6 py-7 md:px-8 md:py-9">
          {post.content.map((block, index) => renderContentBlock(block, getContentBlockKey(block, index)))}
        </Surface>

        <Surface className="px-6 py-6 md:px-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Start free</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">리뷰 분석, 지금 바로 시작해보세요.</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">CSV 업로드만으로 감성 분류, 키워드 추출, 개선 제안까지 한 번에 확인할 수 있습니다.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className={buttonStyles({ variant: "primary" })} href="/dashboard">무료로 분석 시작</a>
            <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>샘플 CSV 다운로드</a>
          </div>
        </Surface>
      </ShellContainer>
    </main>
  );
}
