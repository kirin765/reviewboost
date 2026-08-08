import { unzipSync, strFromU8 } from "fflate";

// 스마트스토어 판매자센터는 리뷰를 xlsx로만 내려준다. 고객이 직접 csv로 변환하게 두면
// 그 단계에서 이탈하거나 헤더가 깨진 파일이 올라온다(2026-07-28 첫 유료 고객 사례).
// 읽기 전용이라 SheetJS 같은 큰 의존성 대신 zip 해제 + 시트 XML 파싱으로 끝낸다.

const NAMED_ENTITIES: Record<string, string> = { lt: "<", gt: ">", quot: '"', apos: "'", amp: "&" };

// 한글은 &#xc0c1; 형태의 16진 참조로 나온다. 이걸 놓치면 본문이 통째로 깨지고,
// 참조 끝의 세미콜론 때문에 구분자 추정까지 틀어진다.
// 한 번에 훑어야 `&amp;#x41;`이 A로 이중 디코드되지 않는다.
function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-fA-F]+|#\d+|lt|gt|quot|apos|amp);/g, (match, body: string) => {
    if (body.startsWith("#x")) return String.fromCodePoint(parseInt(body.slice(2), 16));
    if (body.startsWith("#")) return String.fromCodePoint(Number(body.slice(1)));
    return NAMED_ENTITIES[body] ?? match;
  });
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, ""));
}

function parseSharedStrings(xml: string): string[] {
  return Array.from(xml.matchAll(/<si>([\s\S]*?)<\/si>/g)).map((m) => stripTags(m[1]));
}

function columnIndex(ref: string): number {
  const letters = ref.replace(/\d+/g, "");
  let index = 0;
  for (const ch of letters) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

function csvEscape(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** xlsx 첫 시트를 CSV 텍스트로 변환한다. 값은 전부 문자열로 뽑는다. */
export function xlsxToCsv(data: Uint8Array): string {
  const files = unzipSync(data);
  // zip 수록 순서는 워크북 탭 순서와 무관하다. sheet 번호로 정렬해 첫 시트를 고른다.
  // workbook.xml의 r:id까지 따라가야 완전하지만, 리뷰 내보내기는 시트가 하나뿐이다.
  const sheetName = Object.keys(files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    .sort((a, b) => Number(a.match(/\d+/)![0]) - Number(b.match(/\d+/)![0]))[0];
  if (!sheetName) throw new Error("XLSX_NO_SHEET");

  const shared = files["xl/sharedStrings.xml"] ? parseSharedStrings(strFromU8(files["xl/sharedStrings.xml"])) : [];
  const sheet = strFromU8(files[sheetName]);

  const rows: string[][] = [];
  for (const rowMatch of sheet.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    // 속성이 아예 없는 `<c>`도 있다. `<c\s+`로 잡으면 그런 셀이 통째로 사라진다.
    for (const cellMatch of rowMatch[1].matchAll(/<c((?:\s[^>]*)?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cellMatch[1] ?? "";
      const body = cellMatch[2] ?? "";
      const refMatch = attrs.match(/r="([A-Z]+\d+)"/);
      const index = refMatch ? columnIndex(refMatch[1]) : cells.length;
      while (cells.length < index) cells.push("");

      const type = attrs.match(/t="([^"]+)"/)?.[1];
      let value = "";
      if (type === "inlineStr") {
        value = stripTags(body);
      } else {
        const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1];
        if (raw !== undefined) value = type === "s" ? (shared[Number(raw)] ?? "") : decodeEntities(raw);
      }
      cells[index] = value;
    }
    rows.push(cells);
  }

  const width = rows.reduce((max, row) => Math.max(max, row.length), 0);
  return rows
    .map((row) => Array.from({ length: width }, (_, i) => csvEscape(row[i] ?? "")).join(","))
    .join("\n");
}
