import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import BlogPage from "./page";

describe("/blog page", () => {
  it("renders a featured article and the remaining list rows", async () => {
    const html = renderToStaticMarkup(<BlogPage />);

    expect(html).toContain("이커머스 셀러를 위한 리뷰 운영 가이드");
    expect(html).toContain("href=\"/blog/");
    expect(html).toContain("→");
  });
});
