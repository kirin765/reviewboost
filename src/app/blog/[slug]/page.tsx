import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StructuredData from "@/components/seo/StructuredData";
import ReviewisaStoreLink from "@/components/blog/ReviewisaStoreLink";
import ExtensionInstallLink from "@/components/extension/ExtensionInstallLink";
import { buttonStyles } from "@/components/ui/Button";
import { ShellContainer } from "@/components/ui/Primitives";
import { blogPosts, getBlogCtaIntent, type ContentBlock } from "@/lib/blog-posts";
import { generatePageMetadata } from "@/lib/seo/metadata";
import { getSeoPageRecordByPath } from "@/lib/seo/page-registry";
import { createArticleStructuredData } from "@/lib/seo/structured-data";

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
    return generatePageMetadata(getSeoPageRecordByPath("/blog")!);
  }

  const record = getSeoPageRecordByPath(`/blog/${post.slug}`);
  if (!record) {
    return generatePageMetadata(getSeoPageRecordByPath("/blog")!);
  }

  return generatePageMetadata(record, {
    openGraphType: "article",
    publishedTime: record.updatedAt,
    image: post.image
  });
}

function getContentBlockKey(block: ContentBlock, index: number) {
  if (block.type === "video") {
    return `video-${block.src}-${index}`;
  }
  if (block.type === "image") {
    return `image-${block.src}-${index}`;
  }
  if ("text" in block) {
    return `${block.type}-${block.text}-${index}`;
  }

  return `${block.type}-${block.items.join("|")}-${index}`;
}

function renderContentBlock(block: ContentBlock, key: string) {
  switch (block.type) {
    case "video":
      return (
        <figure key={key} className="my-6">
          <video
            controls
            playsInline
            preload="none"
            poster={block.poster}
            aria-label={block.title}
            width={1920}
            height={1080}
            className="aspect-video h-auto w-full rounded-xl border border-[color:#e6e8f2]"
          >
            <source src={block.src} type="video/mp4" />
            <track kind="captions" src={block.captions} srcLang="ko" label="한국어" />
            <a href={block.href}>YouTube에서 영상 보기</a>
          </video>
          <figcaption className="mt-3 text-pretty text-sm leading-7 text-[var(--rb-muted-strong)]">
            {block.caption}{" "}
            <a href={block.href} className="rounded underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2">YouTube에서 영상 보기</a>
          </figcaption>
        </figure>
      );
    case "image":
      return (
        <figure key={key} className="my-6">
          <img src={block.src} alt={block.alt} width={block.width} height={block.height} loading="lazy" className="mx-auto h-auto max-w-full rounded-xl border border-[color:#e6e8f2]" />
          <figcaption className="mt-3 text-center text-sm text-[var(--rb-muted-strong)]">{block.caption}</figcaption>
        </figure>
      );
    case "link":
      return (
        <p key={key} className="articleParagraph">
          {block.href === "https://store.cafe24.com/kr/apps/43542" && block.placement ? (
            <ReviewisaStoreLink placement={block.placement}>{block.text}</ReviewisaStoreLink>
          ) : (
            <a href={block.href} className="underline underline-offset-4">{block.text}</a>
          )}
        </p>
      );
    case "h2":
      return <h2 key={key} className="articleHeading2">{block.text}</h2>;
    case "h3":
      return <h3 key={key} className="articleHeading3">{block.text}</h3>;
    case "p":
      return <p key={key} className="articleParagraph">{block.text}</p>;
    case "ul":
      return (
        <ul key={key} className="articleList">
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} className="articleList articleListOrdered">
          {block.items.map((item, itemIndex) => (
            <li key={`${item}-${itemIndex}`}>{item}</li>
          ))}
        </ol>
      );
    case "callout":
      return (
        <div className="blogCallout articleCallout" key={key}>
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

  const record = getSeoPageRecordByPath(`/blog/${post.slug}`);

  return (
    <main className="pageMain pb-8 pt-8 md:pt-12">
      {record ? <StructuredData data={createArticleStructuredData(record, { image: post.image })} /> : null}
      <ShellContainer className="max-w-[980px] space-y-6">
        <nav className="text-sm text-[var(--rb-muted-strong)]">
          <Link href="/blog">← 블로그</Link>
        </nav>

        <section className="rounded-[30px] border border-[color:#e6e8f2] bg-white px-6 py-7 md:px-8 md:py-9">
          <span className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-accent)]">{post.tag}</span>
          <h1 className="mt-4 text-[clamp(2.2rem,4vw,4rem)] font-semibold tracking-[-0.06em] text-[var(--rb-fg)]">{post.title}</h1>
          <p className="mt-5 text-base leading-8 text-[var(--rb-muted-strong)]">{post.summary}</p>
          {record ? (
            <p className="mt-4 text-xs text-[var(--rb-muted)]">최종 업데이트: {record.updatedAt} · ReviewBoost 팀</p>
          ) : null}
        </section>

        {post.image ? (
          <img
            src={post.image}
            alt={post.title}
            width={1200}
            height={630}
            className="w-full rounded-[24px] border border-[color:#e6e8f2]"
          />
        ) : null}

        <article className="articleBody px-2 py-2 md:px-4">
          {post.content.map((block, index) => renderContentBlock(block, getContentBlockKey(block, index)))}
        </article>

        {getBlogCtaIntent(post.slug) === "collection" ? (
          <section className="rounded-[26px] border border-[color:#e6e8f2] bg-white px-6 py-6 md:px-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Start free</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">상품 리뷰를 엑셀·CSV로 저장해 보세요.</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">12개 지원 쇼핑몰의 상품 페이지에서 공개 리뷰를 수집할 수 있습니다. 무료로 하루 50개까지 시작하세요.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ExtensionInstallLink placement={`blog_${post.slug}`} />
              <Link className={buttonStyles({ variant: "secondary" })} href="/extension">지원 쇼핑몰·사용법 보기</Link>
            </div>
          </section>
        ) : getBlogCtaIntent(post.slug) === "analysis" ? (
        <section className="rounded-[26px] border border-[color:#e6e8f2] bg-white px-6 py-6 md:px-8">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--rb-muted)]">Start free</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-[var(--rb-fg)]">리뷰 분석, 지금 바로 시작해보세요.</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--rb-muted-strong)]">CSV 업로드만으로 감성 분류, 키워드 추출, 개선 제안까지 한 번에 확인할 수 있습니다.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a className={buttonStyles({ variant: "primary" })} href="/dashboard/analyze">무료로 분석 시작</a>
            <a className={buttonStyles({ variant: "secondary" })} href="/sample.csv" download>샘플 CSV 다운로드</a>
          </div>
        </section>
        ) : null}
      </ShellContainer>
    </main>
  );
}
