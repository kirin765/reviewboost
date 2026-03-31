import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import StructuredData from "@/components/seo/StructuredData";
import { blogPosts, type ContentBlock } from "@/lib/blog-posts";
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

  return generatePageMetadata(record, { openGraphType: "article", publishedTime: record.updatedAt });
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
    <main className="pageMain marketingPage">
      <StructuredData data={createArticleStructuredData(getSeoPageRecordByPath(`/blog/${post.slug}`)!)} />
      <nav className="blogBreadcrumb">
        <Link href="/blog">← 블로그</Link>
      </nav>

      <section className="card blogPostHeader">
        <span className="badge">{post.tag}</span>
        <h1>{post.title}</h1>
        <p className="contentPageLead">{post.summary}</p>
      </section>

      <article className="card blogPostBody">
        {post.content.map((block, index) => renderContentBlock(block, getContentBlockKey(block, index)))}
      </article>

      <section className="card marketingCallout">
        <div>
          <p className="sectionEyebrow">Start free</p>
          <h2>리뷰 분석, 지금 바로 시작해보세요.</h2>
          <p className="muted">CSV 업로드만으로 감성 분류, 키워드 추출, 개선 제안까지 한 번에 확인할 수 있습니다.</p>
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
