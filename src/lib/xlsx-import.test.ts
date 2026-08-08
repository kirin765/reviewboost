import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import { xlsxToCsv } from "./xlsx-import";
import { previewReviewCsv } from "./csv";

// 스마트스토어 판매자센터 리뷰 다운로드의 실제 구조(sharedStrings + 25열)를 최소로 재현한다.
function smartstoreXlsx(): Uint8Array {
  const strings = [
    "상품번호", "구매자평점", "리뷰상세내용", "리뷰등록일", "유저정보 등록 항목",
    "공간이 넓어서 냥이가 자꾸 빠져나옵니다", "2026.06.19. 17:08:26",
    "여전히 잘 소장중 입니다 감사합니다!", "2025.09.22. 13:25:42"
  ];
  const sharedStrings = `<sst>${strings.map((s) => `<si><t>${s}</t></si>`).join("")}</sst>`;
  const row = (n: number, indices: (number | null)[]) =>
    `<row r="${n}">${indices
      .map((idx, col) =>
        idx === null
          ? ""
          : `<c r="${String.fromCharCode(65 + col)}${n}" t="s"><v>${idx}</v></c>`
      )
      .join("")}</row>`;
  const sheet = `<worksheet><sheetData>${[
    row(1, [0, 1, 2, 3, 4]),
    row(2, [null, null, 5, 6, null]),
    row(3, [null, null, 7, 8, null])
  ].join("")}</sheetData></worksheet>`;

  return zipSync({
    "xl/sharedStrings.xml": strToU8(sharedStrings),
    "xl/worksheets/sheet1.xml": strToU8(sheet)
  });
}

describe("xlsxToCsv", () => {
  it("converts a 스마트스토어 리뷰 xlsx into csv the parser can map", () => {
    const csv = xlsxToCsv(smartstoreXlsx());
    const lines = csv.split("\n");

    expect(lines[0]).toBe("상품번호,구매자평점,리뷰상세내용,리뷰등록일,유저정보 등록 항목");
    expect(lines).toHaveLength(3);

    const preview = previewReviewCsv(csv, "review_20260808.xlsx");
    expect(preview.headerMode).toBe("header");
    expect(preview.inferred.textCol).toBe("리뷰상세내용");
    expect(preview.inferred.ratingCol).toBe("구매자평점");
    expect(preview.inferred.dateCol).toBe("리뷰등록일");
  });

  it("keeps empty leading cells aligned instead of shifting columns left", () => {
    const csv = xlsxToCsv(smartstoreXlsx());
    // 2행은 A·B가 비어 있다. 자리를 안 지키면 리뷰 본문이 상품번호 열로 밀린다.
    expect(csv.split("\n")[1].startsWith(",,")).toBe(true);
  });

  it("escapes commas and quotes so a review sentence cannot split columns", () => {
    const sheet =
      '<worksheet><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>리뷰상세내용</t></is></c></row>' +
      '<row r="2"><c r="A2" t="inlineStr"><is><t>좋아요, 정말 "만족"합니다</t></is></c></row></sheetData></worksheet>';
    const csv = xlsxToCsv(zipSync({ "xl/worksheets/sheet1.xml": strToU8(sheet) }));

    expect(csv.split("\n")[1]).toBe('"좋아요, 정말 ""만족""합니다"');
    expect(previewReviewCsv(csv).totalRows).toBe(1);
  });

  // 실파일에서 한글이 통째로 깨졌던 자리다. 참조 끝의 세미콜론 때문에 구분자 추정까지 틀어졌다.
  it("decodes hex character references used for Korean text", () => {
    const sheet =
      '<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c></row>' +
      '<row r="2"><c r="A2" t="s"><v>1</v></c></row></sheetData></worksheet>';
    const shared = "<sst><si><t>&#xb9ac;&#xbdf0;&#xc0c1;&#xc138;&#xb0b4;&#xc6a9;</t></si>" +
      "<si><t>&#xc798; &#xc4f0;&#xace0; &#xc788;&#xc2b5;&#xb2c8;&#xb2e4;</t></si></sst>";
    const csv = xlsxToCsv(
      zipSync({ "xl/worksheets/sheet1.xml": strToU8(sheet), "xl/sharedStrings.xml": strToU8(shared) })
    );

    expect(csv.split("\n")).toEqual(["리뷰상세내용", "잘 쓰고 있습니다"]);
  });

  it("throws when the archive has no worksheet", () => {
    expect(() => xlsxToCsv(zipSync({ "docProps/app.xml": strToU8("<x/>") }))).toThrow("XLSX_NO_SHEET");
  });
});
