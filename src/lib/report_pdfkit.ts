import PDFDocument from "pdfkit";
import type { AnalysisStats, Suggestions } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

type PdfChunk = Buffer | Uint8Array | string;
type ReportPdfDocument = InstanceType<typeof PDFDocument>;

type RenderInput = {
  title: string;
  stats: AnalysisStats;
  suggestions: Suggestions;
  meta?: {
    filename?: string | null;
    createdAt?: string;
  };
  requireKoreanFont?: boolean;
};

type ListItem = {
  label: string;
  badge?: string;
};

type RenderContext = {
  doc: ReportPdfDocument;
  x: number;
  y: number;
  width: number;
};

type DrawListResult = {
  nextIndex: number;
  panelHeight: number;
};

const MARGIN = {
  left: 40,
  right: 40,
  top: 34,
  bottom: 34
};

const THEME = {
  text: "#1f2540",
  muted: "#6b7090",
  accent: "#5b5cea",
  accentStrong: "#4a4bd6",
  line: "#e6e8f2",
  soft: "#f7f8fc",
  surface: "#ffffff",
  warn: "#d97706",
  ok: "#059669"
};

const SECTION_GAP = 12;
const CARD_CORNER = 10;
const LINE_GAP = 2.2;

function clampRatio(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function safeNum(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "-";
  if (decimals === 0) return `${Math.round(value)}`;
  return value.toFixed(decimals);
}

function safePercent(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function safeText(value: unknown): string {
  return String(value ?? "");
}

function safeDate(value?: string): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function findKoreanFontPath(): string | null {
  const envPath = (process.env.REPORT_FONT_PATH ?? "").trim();
  const candidates = [
    envPath || null,
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.otf"),
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.ttf"),
    path.join(process.cwd(), "assets/fonts/NotoSansCJKkr-Regular.otf"),
    path.join(process.cwd(), "assets/fonts/NotoSansCJKkr-Regular.ttf"),
    "/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf",
    "/usr/share/fonts/opentype/noto/NotoSansKR-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf"
  ].filter((p): p is string => !!p);

  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return file;
    } catch {
      // ignore
    }
  }

  return null;
}

function measureHeight(
  doc: ReportPdfDocument,
  text: string,
  width: number,
  size: number,
  lineGap = LINE_GAP
): number {
  // PDFKit's heightOfString ignores the `size` option and measures with the current
  // font size, so it must be set explicitly or rows get sized at a stale size and overlap.
  doc.fontSize(size);
  return Math.ceil(doc.heightOfString(text, { width, align: "left", lineGap }));
}

function measureWidth(doc: ReportPdfDocument, text: string, size: number): number {
  // widthOfString ignores the `size` option too — set the size before measuring.
  doc.fontSize(size);
  return doc.widthOfString(text);
}

function collectPdf(doc: ReportPdfDocument): Promise<Buffer> {
  const chunks: PdfChunk[] = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk: PdfChunk) => {
      chunks.push(chunk);
    });
    doc.on("error", (error) => {
      reject(error);
    });
    doc.on("end", () => {
      const bufferChunks = chunks.map((chunk) => (Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      resolve(Buffer.concat(bufferChunks));
    });
    doc.end();
  });
}

function pageBottom(ctx: RenderContext): number {
  return ctx.doc.page.height - MARGIN.bottom;
}

function ensureSpace(ctx: RenderContext, needed: number) {
  if (ctx.y + needed <= pageBottom(ctx)) return;
  ctx.doc.addPage();
  ctx.y = MARGIN.top;
}

function drawPanel(
  ctx: RenderContext,
  x: number,
  y: number,
  width: number,
  height: number,
  title: string,
  withHeader = true
) {
  const doc = ctx.doc;
  const headerHeight = withHeader ? 34 : 0;
  const panelHeight = Math.max(70, height);

  doc
    .lineWidth(0.8)
    .strokeColor(THEME.line)
    .roundedRect(x, y, width, panelHeight, CARD_CORNER)
    .stroke();

  if (withHeader) {
    doc
      .fillColor(THEME.soft)
      .roundedRect(x + 1, y + 1, width - 2, headerHeight, CARD_CORNER)
      .fill();

    doc
      .fillColor(THEME.text)
      .fontSize(12)
      .text(title, x + 12, y + 10, { width: width - 24 });

    doc
      .lineWidth(0.7)
      .strokeColor(THEME.line)
      .moveTo(x + 12, y + headerHeight)
      .lineTo(x + width - 12, y + headerHeight)
      .stroke();
  }

  return {
    contentX: x + 11,
    contentY: withHeader ? y + 44 : y + 18,
    contentBottom: y + panelHeight - 10,
    innerW: width - 22,
    panelHeight,
    headerHeight
  };
}

function drawTag(ctx: RenderContext, x: number, y: number, label: string): number {
  const doc = ctx.doc;
  const w = Math.min(78, Math.max(30, measureWidth(doc, label, 8) + 12));
  const h = 16;

  doc
    .fillColor(THEME.surface)
    .strokeColor(THEME.line)
    .lineWidth(0.7)
    .roundedRect(x, y, w, h, 8)
    .fillAndStroke();

  doc
    .fillColor(THEME.muted)
    .fontSize(8)
    .text(label, x + 6, y + 4, { width: w - 12, align: "center" });

  return w;
}

function drawBar(
  ctx: RenderContext,
  x: number,
  y: number,
  width: number,
  ratio: number,
  label: string
) {
  const doc = ctx.doc;
  const safe = clampRatio(ratio);
  const barH = 8;

  doc
    .lineWidth(0.7)
    .strokeColor(THEME.line)
    .roundedRect(x, y, width, barH, 5)
    .stroke();

  if (safe > 0) {
    const fillW = Math.max(1, width * safe);
    doc
      .fillColor(THEME.accent)
      .roundedRect(x, y, fillW, barH, 5)
      .fill();
  }

  doc
    .fillColor(THEME.text)
    .fontSize(9)
    .text(`${label}: ${safePercent(safe)}`, x, y + 11, { width, align: "left" });
}

function drawKpiGrid(ctx: RenderContext, items: Array<{ label: string; value: string; hint: string }>) {
  const cols = 4;
  const gap = 10;
  const cardW = (ctx.width - gap * (cols - 1)) / cols;
  const cardH = 84;
  ensureSpace(ctx, cardH);

  const accents = [THEME.accent, "#6366f1", THEME.warn, THEME.ok];

  items.forEach((item, index) => {
    const x = ctx.x + index * (cardW + gap);
    const p = drawPanel(ctx, x, ctx.y, cardW, cardH, "", false);

    docLine(ctx, x, ctx.y, p.panelHeight, accents[index]);

    ctx.doc
      .fillColor(THEME.muted)
      .fontSize(10)
      .text(item.label, p.contentX, p.contentY - 4, { width: p.innerW });

    ctx.doc
      .fillColor(THEME.text)
      .fontSize(24)
      .text(item.value, p.contentX, p.contentY + 14, {
        width: p.innerW,
        lineGap: 0
      });

    ctx.doc
      .fillColor(THEME.muted)
      .fontSize(10)
      .text(item.hint, p.contentX, p.contentY + 52, { width: p.innerW });
  });

  ctx.y += cardH + SECTION_GAP;
}

function docLine(ctx: RenderContext, x: number, y: number, panelHeight: number, color: string) {
  ctx.doc
    .lineWidth(1)
    .strokeColor(color)
    .moveTo(x + 1, y + 2)
    .lineTo(x + 1, y + panelHeight - 2)
    .stroke();
}

function drawListRow(ctx: RenderContext, x: number, y: number, width: number, item: ListItem): number {
  const text = `• ${safeText(item.label)}`;
  const badgeW = item.badge ? Math.min(72, Math.max(24, measureWidth(ctx.doc, item.badge, 8) + 12)) : 0;
  const rowW = width - 22;
  const textW = Math.max(24, rowW - 22 - badgeW);
  const rowH = Math.max(24, measureHeight(ctx.doc, text, textW, 10, 1.7) + 8);

  ctx.doc
    .lineWidth(0.7)
    .strokeColor(THEME.line)
    .roundedRect(x + 11, y, rowW, rowH, 7)
    .stroke();

  ctx.doc
    .fillColor(THEME.text)
    .fontSize(10)
    .text(text, x + 20, y + 6, {
      width: textW,
      lineGap: 1.7
    });

  if (item.badge) {
    const bx = x + 11 + rowW - badgeW - 10;
    const by = y + Math.max(4, (rowH - 16) / 2);
    drawTag(ctx, bx, by, item.badge);
  }

  return rowH + 6;
}

function estimateListRows(
  ctx: RenderContext,
  items: ListItem[],
  startIndex: number,
  width: number,
  maxContentHeight: number,
  showEmpty: boolean
): { count: number; usedHeight: number } {
  const effective = items.length > 0 ? items : showEmpty ? [{ label: "데이터가 없습니다." }] : [];

  if (effective.length === 0 || startIndex >= effective.length) {
    return { count: 0, usedHeight: 0 };
  }

  const slice = effective.slice(startIndex);
  let used = 0;
  let count = 0;

  for (let i = 0; i < slice.length; i++) {
    const rowH = drawListRowHeight(ctx.doc, width, slice[i]);
    const need = count === 0 ? rowH : used + rowH + 6;

    if (need > maxContentHeight && count === 0) {
      return { count: 1, usedHeight: rowH };
    }

    if (need > maxContentHeight) {
      break;
    }

    used = need;
    count += 1;
  }

  return { count, usedHeight: used };
}

function drawListRowHeight(doc: ReportPdfDocument, width: number, item: ListItem): number {
  const badgeW = item.badge ? Math.min(72, Math.max(24, measureWidth(doc, item.badge, 8) + 12)) : 0;
  const textW = Math.max(24, width - 22 - 22 - badgeW);
  const textH = measureHeight(doc, `• ${safeText(item.label)}`, textW, 10, 1.7);
  return Math.max(24, textH + 8);
}

function drawListSectionChunk(
  ctx: RenderContext,
  x: number,
  width: number,
  startY: number,
  title: string,
  items: ListItem[],
  startIndex: number,
  showEmpty = true,
  continuation = false
): DrawListResult {
  const effective = items.length > 0 ? items : showEmpty ? [{ label: "데이터가 없습니다." }] : [];

  if (effective.length === 0 || startIndex >= effective.length) {
    return { nextIndex: startIndex, panelHeight: 0 };
  }

  const effectiveY = ensureSpaceForChunk(ctx, startY);

  const maxHeight = pageBottom(ctx) - effectiveY - 34;
  const estimate = estimateListRows(ctx, effective, startIndex, width, Math.max(24, maxHeight - 20), showEmpty);
  const rows = effective.slice(startIndex, startIndex + estimate.count);
  const panelHeight = Math.max(78, 48 + estimate.usedHeight);

  const panel = drawPanel(ctx, x, effectiveY, width, panelHeight, continuation ? `${title} (계속)` : title, true);
  let rowY = panel.contentY;

  for (const row of rows) {
    const used = drawListRow(ctx, x, rowY, width, row);
    rowY += used;
  }

  const hasMore = startIndex + estimate.count < effective.length;
  if (hasMore) {
    ctx.doc
      .fillColor(THEME.muted)
      .fontSize(8)
      .text("다음 페이지에서 이어짐", panel.contentX, panel.contentBottom - 8, {
        width: panel.innerW,
        align: "right"
      });
  }

  return {
    nextIndex: startIndex + estimate.count,
    panelHeight
  };
}

function ensureSpaceForChunk(ctx: RenderContext, startY: number): number {
  if (startY + 120 <= pageBottom(ctx)) return startY;
  ctx.doc.addPage();
  return MARGIN.top;
}

function drawListSection(
  ctx: RenderContext,
  x: number,
  width: number,
  title: string,
  items: ListItem[],
  startIndex: number,
  showEmpty = true,
  continuation = false
): DrawListResult {
  const result = drawListSectionChunk(ctx, x, width, ctx.y, title, items, startIndex, showEmpty, continuation);
  if (result.panelHeight > 0) {
    ctx.y += result.panelHeight + SECTION_GAP;
  }

  return result;
}

function drawTwoColumnSections(
  ctx: RenderContext,
  left: { title: string; items: ListItem[] },
  right: { title: string; items: ListItem[] }
) {
  const gap = 10;
  const colW = (ctx.width - gap) / 2;
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < left.items.length || rightIndex < right.items.length) {
    const startY = ensureSpaceForChunk(ctx, ctx.y);
    ctx.y = startY;

    const leftRes = leftIndex < left.items.length
      ? drawListSectionChunk(
          { ...ctx, y: startY },
          ctx.x,
          colW,
          startY,
          left.title,
          left.items,
          leftIndex,
          true,
          leftIndex > 0
        )
      : { nextIndex: leftIndex, panelHeight: 0 };

    const rightRes = rightIndex < right.items.length
      ? drawListSectionChunk(
          { ...ctx, y: startY },
          ctx.x + colW + gap,
          colW,
          startY,
          right.title,
          right.items,
          rightIndex,
          true,
          rightIndex > 0
        )
      : { nextIndex: rightIndex, panelHeight: 0 };

    leftIndex = Math.min(left.items.length, leftRes.nextIndex);
    rightIndex = Math.min(right.items.length, rightRes.nextIndex);

    const nextY = startY + Math.max(leftRes.panelHeight, rightRes.panelHeight);
    ctx.y = nextY + SECTION_GAP;

    if (leftIndex < left.items.length || rightIndex < right.items.length) {
      ctx.doc.addPage();
      ctx.y = MARGIN.top;
    }
  }
}

function drawMetricsSummary(ctx: RenderContext, stats: AnalysisStats) {
  const panelH = 102;
  ensureSpace(ctx, panelH);
  const panel = drawPanel(ctx, ctx.x, ctx.y, ctx.width, panelH, "지표 요약");

  const half = (panel.innerW - 10) / 2;
  const recent30 = safePercent(stats.recentness?.last30Share || 0);
  const recent90 = safePercent(stats.recentness?.last90Share || 0);

  drawBar(ctx, panel.contentX, panel.contentY + 18, half - 2, (stats.recentness?.last30Share || 0), `최근 30일 리뷰 비중 ${recent30}`);
  drawBar(ctx, panel.contentX + half + 10, panel.contentY + 18, half - 2, (stats.recentness?.last90Share || 0), `최근 90일 리뷰 비중 ${recent90}`);

  const recentHint = stats.recentness?.hasDates
    ? `최근성 지표: 최근 30일 ${safePercent(stats.recentness.last30Share)} · 최근 90일 ${safePercent(stats.recentness.last90Share)}`
    : "작성일이 없어 최근성 지표는 약하게 반영됩니다.";

  ctx.doc
    .fillColor(THEME.muted)
    .fontSize(9)
    .text(recentHint, panel.contentX, panel.contentY + 66, {
      width: panel.innerW,
      lineGap: 1.4
    });

  ctx.y += panelH + SECTION_GAP;
}

export async function renderReportPdfBuffer(input: RenderInput): Promise<Buffer> {
  const fontPath = findKoreanFontPath();
  if (input.requireKoreanFont && !fontPath) {
    throw new Error("PDFKit font missing");
  }

  const doc = new PDFDocument({ size: "A4", margin: 0 });

  if (fontPath) {
    doc.registerFont("RB-KO", fontPath);
    doc.font("RB-KO");
  }

  const { title, stats, suggestions, meta } = input;
  const fileName = safeText(meta?.filename ?? "-");
  const createdAt = safeDate(meta?.createdAt);

  const ctx: RenderContext = {
    doc,
    x: MARGIN.left,
    y: MARGIN.top,
    width: doc.page.width - MARGIN.left - MARGIN.right
  };

  const header = drawPanel(ctx, ctx.x, ctx.y, ctx.width, 94, "ReviewBoost 분석 리포트");
  doc
    .fillColor(THEME.text)
    .fontSize(24)
    .text(safeText(title), header.contentX, header.contentY - 4, {
      width: header.innerW,
      lineGap: 1.5
    });

  doc
    .fillColor(THEME.muted)
    .fontSize(10)
    .text(`파일: ${fileName}`, header.contentX, header.contentY + 34, { width: header.innerW });

  doc
    .fillColor(THEME.muted)
    .fontSize(10)
    .text(`생성일: ${createdAt}`, header.contentX, header.contentY + 48, { width: header.innerW });

  const metaLine = `총 리뷰: ${safeNum(stats.total)}  ·  긍정: ${safeNum(stats.positive)}  ·  부정: ${safeNum(stats.negative)}  ·  중립: ${safeNum(stats.neutral)}`;
  doc
    .fillColor(THEME.accent)
    .fontSize(9)
    .text(metaLine, header.contentX, header.contentY + 66, {
      width: header.innerW,
      lineGap: 1.4
    });

  ctx.y += 94 + SECTION_GAP;

  drawKpiGrid(ctx, [
    { label: "리뷰 수", value: safeNum(stats.total), hint: "총 업로드된 리뷰" },
    { label: "평균 별점", value: stats.avgRating === null ? "-" : safeNum(stats.avgRating, 2), hint: "5점 만점" },
    { label: "부정 비율", value: safePercent(stats.negativeRatio), hint: "전체 대비 부정 리뷰" },
    { label: "우선순위 점수", value: safeNum(stats.priorityScore, 1), hint: "개선 우선순위" }
  ]);

  drawMetricsSummary(ctx, stats);

  const keywordItems: ListItem[] = stats.negativeKeywordsTop10.map((item) => ({
    label: safeText(item.keyword),
    badge: safeNum(item.count)
  }));

  const categoryItems: ListItem[] = Object.entries(stats.categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({
      label: safeText(label),
      badge: safeNum(count)
    }));

  const detailItems: ListItem[] = suggestions.detailPageCopy.map((item, index) => ({
    label: safeText(item),
    badge: String(index + 1)
  }));

  const csItems: ListItem[] = suggestions.csResponseTemplates.map((item, index) => ({
    label: safeText(item),
    badge: String(index + 1)
  }));

  const faqItems: ListItem[] = suggestions.faqRecommendations.map((item, index) => ({
    label: safeText(item),
    badge: String(index + 1)
  }));

  drawTwoColumnSections(
    ctx,
    {
      title: "부정 키워드 Top 10",
      items: keywordItems
    },
    {
      title: "문제 카테고리",
      items: categoryItems
    }
  );

  drawTwoColumnSections(
    ctx,
    {
      title: "개선 제안(상세페이지)",
      items: detailItems
    },
    {
      title: "개선 제안(CS 응대)",
      items: csItems
    }
  );

  const faqRows = faqItems.length === 0 ? [{ label: "현재 제안 데이터가 없습니다.", badge: "" }] : faqItems;

  let faqIndex = 0;
  while (faqIndex < faqRows.length) {
    const faqResult = drawListSection(ctx, ctx.x, ctx.width, "개선 제안(FAQ)", faqRows, faqIndex, true, faqIndex > 0);
    faqIndex = faqResult.nextIndex;
    if (faqResult.panelHeight === 0) break;
  }

  const noteRows: ListItem[] =
    suggestions.notes.length === 0
      ? [{ label: "추가 메모가 없습니다." }]
      : suggestions.notes.map((item, index) => ({
          label: safeText(item),
          badge: String(index + 1)
        }));

  let noteIndex = 0;
  while (noteIndex < noteRows.length) {
    const noteResult = drawListSection(ctx, ctx.x, ctx.width, "Notes", noteRows, noteIndex, true, noteIndex > 0);
    noteIndex = noteResult.nextIndex;
    if (noteResult.panelHeight === 0) break;
  }

  if (ctx.y + 20 > pageBottom(ctx)) {
    doc.addPage();
    ctx.y = MARGIN.top;
  }

  doc
    .fillColor(THEME.muted)
    .fontSize(8)
    .text("/dashboard 분석 뷰와 동일한 섹션 기반 구조로 구성", ctx.x, pageBottom(ctx) - 16, {
      width: ctx.width,
      align: "center"
    });

  return collectPdf(doc);
}
