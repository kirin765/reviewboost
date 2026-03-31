import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HelpPage from "./page";

describe("/help page", () => {
  it("renders the scrollable 4-step guide structure", async () => {
    const html = renderToStaticMarkup(<HelpPage />);

    expect(html).toContain("스크롤하면서 분석 과정을 한 단계씩 확인하세요");
    expect(html).toContain("단계 안내");
    expect(html).toContain("CSV 준비");
    expect(html).toContain("업로드");
    expect(html).toContain("열 확인");
    expect(html).toContain("결과 활용");
    expect(html).toContain("이 단계에서 하는 일");
  });
});
