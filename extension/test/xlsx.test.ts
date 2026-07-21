import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { reviewsToXlsx } from "../src/lib/xlsx";

describe("reviewsToXlsx", () => {
  const buf = reviewsToXlsx([
    { text: "안녕하세요", rating: 5, reviewedAt: "2026-01-15T00:00:00.000Z", title: "굿", author: "철수", helpfulCount: 2 }
  ]);
  const files = unzipSync(buf);

  it("produces a valid unzippable OOXML package", () => {
    expect(files["[Content_Types].xml"]).toBeTruthy();
    expect(files["xl/workbook.xml"]).toBeTruthy();
    expect(files["xl/worksheets/sheet1.xml"]).toBeTruthy();
  });

  it("writes headers, korean text, and numeric cells", () => {
    const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("리뷰내용");
    expect(sheet).toContain("안녕하세요");
    expect(sheet).toContain("<v>5</v>");
  });

  it("escapes xml-significant characters", () => {
    const x = reviewsToXlsx([{ text: "a<b>&c", rating: null, reviewedAt: null }]);
    const sheet = strFromU8(unzipSync(x)["xl/worksheets/sheet1.xml"]);
    expect(sheet).toContain("a&lt;b&gt;&amp;c");
  });
});
