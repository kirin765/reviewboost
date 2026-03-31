import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BlogDetailPage from "./page";

describe("/blog/[slug] page", () => {
  it("renders structured article typography hooks for longform content", async () => {
    const html = renderToStaticMarkup(
      await BlogDetailPage({
        params: Promise.resolve({ slug: "coupang-review-analysis" })
      })
    );

    expect(html).toContain("articleBody");
    expect(html).toContain("articleHeading2");
    expect(html).toContain("articleParagraph");
    expect(html).toContain("articleCallout");
  });
});
