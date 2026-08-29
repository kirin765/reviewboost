import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { SMARTSTORE_REVIEW_HEADERS } from "../src/lib/excel-form";
import { reviewsToXlsx } from "../src/lib/xlsx";

describe("reviewsToXlsx", () => {
  const buf = reviewsToXlsx(
    [
      {
        text: "안녕하세요",
        rating: 5,
        reviewedAt: "2026-01-15T00:00:00.000Z",
        author: "철수",
        helpfulCount: 2
      }
    ],
    { productNo: "13089995455", productTitle: "테스트 상품" }
  );
  const files = unzipSync(buf);

  it("produces a valid unzippable OOXML package", () => {
    expect(files["[Content_Types].xml"]).toBeTruthy();
    expect(files["xl/workbook.xml"]).toBeTruthy();
    expect(files["xl/worksheets/sheet1.xml"]).toBeTruthy();
  });

  it("writes the official SmartStore header row", () => {
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    for (const h of SMARTSTORE_REVIEW_HEADERS) expect(sheet).toContain(h);
  });

  it("fills official positions: product context, rating (numeric), korean text, KST date", () => {
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("13089995455");
    expect(sheet).toContain("테스트 상품");
    expect(sheet).toContain("안녕하세요");
    expect(sheet).toContain("<v>5</v>");
    expect(sheet).toContain("<v>2</v>");
    expect(sheet).toContain("2026.01.15. 09:00:00");
  });

  it("writes image urls into 포토/영상, preserving newlines between multiple urls", () => {
    const x = reviewsToXlsx([
      {
        text: "사진",
        rating: null,
        reviewedAt: null,
        imageUrls: ["https://a.com/1.jpg", "https://a.com/2.jpg"]
      }
    ]);
    const sheet = strFromU8(unzipSync(x)["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("https://a.com/1.jpg\nhttps://a.com/2.jpg");
  });

  it("escapes xml-significant characters", () => {
    const x = reviewsToXlsx([{ text: "a<b>&c", rating: null, reviewedAt: null }]);
    const sheet = strFromU8(unzipSync(x)["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("a&lt;b&gt;&amp;c");
  });
});
