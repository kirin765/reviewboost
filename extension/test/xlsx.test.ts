import { strFromU8, unzipSync } from "fflate";
import { describe, expect, it } from "vitest";
import { SMARTSTORE_REVIEW_HEADERS } from "../src/lib/excel-form";
import { reviewsToXlsx, SMARTSTORE_SHEET_NAME } from "../src/lib/xlsx";

// sharedStrings.xml 의 <t> 텍스트를 단순 엔티티(&amp; &lt; &gt;)만 디코드해 배열로 추출
function sharedStrings(files: Record<string, Uint8Array>): string[] {
  const xml = strFromU8(files["xl/sharedStrings.xml"]);
  return Array.from(xml.matchAll(/<si><t>([\s\S]*?)<\/t><\/si>/g)).map((m) =>
    m[1].replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  );
}

describe("reviewsToXlsx — 스마트스토어 공식 엑셀 폼 재현", () => {
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
  const sheet = strFromU8(files["xl/worksheets/sheet1.xml"]);
  const strings = sharedStrings(files);

  it("공식 패키지 파트를 모두 포함한다 (sharedStrings/styles/docProps)", () => {
    expect(files["[Content_Types].xml"]).toBeTruthy();
    expect(files["_rels/.rels"]).toBeTruthy();
    expect(files["docProps/core.xml"]).toBeTruthy();
    expect(files["docProps/app.xml"]).toBeTruthy();
    expect(files["xl/workbook.xml"]).toBeTruthy();
    expect(files["xl/styles.xml"]).toBeTruthy();
    expect(files["xl/sharedStrings.xml"]).toBeTruthy();
    expect(files["xl/worksheets/sheet1.xml"]).toBeTruthy();
  });

  it("시트명은 공식 'Sheet0' 이고 25열 폭이 정의된다", () => {
    const wb = strFromU8(files["xl/workbook.xml"]);
    expect(wb).toContain(`<sheet name="${SMARTSTORE_SHEET_NAME}" r:id="rId3" sheetId="1"/>`);
    expect(sheet).toContain('<col min="1" max="1" width="23.0"');
    expect(sheet).toContain('<col min="13" max="13" width="47.0"');
    expect(sheet).toContain('<col min="25" max="25" width="29.0"');
  });

  it("헤더 행은 스타일 1(굵은 노랑+테두리)로 25열 shared string 셀", () => {
    const headerRow = sheet.match(/<row r="1">(.*?)<\/row>/)?.[1] ?? "";
    expect(headerRow.match(/<c /g)?.length).toBe(25);
    expect(headerRow).toContain('<c r="A1" s="1" t="s"><v>0</v></c>');
    expect(headerRow).toContain('<c r="Y1" s="1" t="s"><v>24</v></c>');
    for (const h of SMARTSTORE_REVIEW_HEADERS) expect(strings).toContain(h);
  });

  it("데이터 행은 ht=50 + 스타일 2, 상품번호/상품명/리뷰내용/날짜는 공식 위치", () => {
    expect(sheet).toContain('<row r="2" ht="50.0" customHeight="1">');
    expect(strings).toContain("13089995455"); // A2 상품번호
    expect(strings).toContain("테스트 상품"); // B2 상품명
    expect(strings).toContain("안녕하세요"); // F2 리뷰상세내용
    expect(strings).toContain("2026.01.15. 09:00:00"); // I2 리뷰등록일 (KST 공식 표기)
    expect(sheet).toContain('<c r="C2" s="2"></c>'); // 빈 셀(리뷰구분)은 스타일만
  });

  it("구매자평점·리뷰도움수는 t=\"n\" 숫자 셀", () => {
    expect(sheet).toContain('<c r="D2" s="2" t="n"><v>5</v></c>');
    expect(sheet).toContain('<c r="G2" s="2" t="n"><v>2</v></c>');
  });

  it("포토/영상은 이미지 URL 줄바꿈 보존", () => {
    const x = reviewsToXlsx([
      {
        text: "사진",
        rating: null,
        reviewedAt: null,
        imageUrls: ["https://a.com/1.jpg", "https://a.com/2.jpg"]
      }
    ]);
    expect(sharedStrings(unzipSync(x))).toContain("https://a.com/1.jpg\nhttps://a.com/2.jpg");
  });

  it("XML 특수문자 이스케이프 (shared string 안)", () => {
    const x = reviewsToXlsx([{ text: "a<b>&c", rating: null, reviewedAt: null }]);
    const xml = strFromU8(unzipSync(x)["xl/sharedStrings.xml"]);
    expect(xml).toContain("<t>a&lt;b&gt;&amp;c</t>");
  });

  it("스타일 시트는 공식 형태 (FFFF99 노랑 헤더 + 테두리 + wrap)", () => {
    const styles = strFromU8(files["xl/styles.xml"]);
    expect(styles).toContain('<fgColor rgb="FFFF99"/>');
    expect(styles).toContain('wrapText="true"');
    expect(styles).toContain('horizontal="center"');
  });
});