import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import HelpPage from "./page";

describe("/help page", () => {
  it("renders collection guides with optional analysis links", async () => {
    const html = renderToStaticMarkup(<HelpPage />);

    expect(html).toContain("상품 리뷰를 엑셀로 저장하는 방법");
    expect(html).toContain("chromewebstore.google.com");
    expect(html).toContain("/help/coupang-review-csv-export");
    expect(html).toContain("/help/smartstore-review-csv-export");
    expect(html).toContain("/dashboard/analyze");
  });
});
