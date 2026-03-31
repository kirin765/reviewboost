import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HelpPage from "./page";

describe("/help page", () => {
  it("renders the onboarding step strip", async () => {
    const html = renderToStaticMarkup(<HelpPage />);

    expect(html).toContain("CSV 업로드부터 결과 활용까지");
    expect(html).toContain("CSV 준비");
    expect(html).toContain("업로드");
    expect(html).toContain("열 확인");
    expect(html).toContain("결과 활용");
  });
});
