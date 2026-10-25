import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EXTENSION_STORE_URL } from "@/lib/extension";
import BlogPage from "../page";
import BlogDetailPage from "./page";

async function renderDetail(slug: string) {
  return renderToStaticMarkup(await BlogDetailPage({ params: Promise.resolve({ slug }) }));
}

describe("/blog/[slug] page", () => {
  it("renders structured typography and analysis actions for analysis intent", async () => {
    const html = await renderDetail("coupang-review-analysis");

    expect(html).toContain("articleBody");
    expect(html).toContain("articleHeading2");
    expect(html).toContain("articleParagraph");
    expect(html).toContain("articleCallout");
    expect(html).toContain('href="/dashboard/analyze"');
    expect(html).not.toContain(EXTENSION_STORE_URL);
  });

  it("renders installation and product-guide actions for collection intent", async () => {
    const html = await renderDetail("reviewboost-extension-excel-guide");

    expect(html).toContain(EXTENSION_STORE_URL);
    expect(html).toContain('href="/extension"');
    expect(html).toContain("상품 리뷰를 엑셀·CSV로 저장해 보세요.");
    expect(html).not.toContain('href="/dashboard/analyze"');
  });

  it("does not add an unrelated ReviewBoost CTA to the Reviewisa guide", async () => {
    const html = await renderDetail("cafe24-review-migration-checklist");

    expect(html).not.toContain("Start free");
    expect(html).not.toContain('href="/dashboard/analyze"');
    expect(html).not.toContain(EXTENSION_STORE_URL);
  });

  it("leads the blog hub to extension installation and product guidance", () => {
    const html = renderToStaticMarkup(<BlogPage />);

    expect(html).toContain(EXTENSION_STORE_URL);
    expect(html).toContain('href="/extension"');
    expect(html).toContain("쇼핑몰 리뷰를 엑셀·CSV로 저장하세요.");
  });
});
