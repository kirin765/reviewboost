import PDFDocument from "pdfkit";
import type { AnalysisStats, Suggestions } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

function line(doc: any, s: string) {
  doc.text(s, { lineGap: 2 });
}

function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function findKoreanFontPath(): string | null {
  const envPath = (process.env.REPORT_FONT_PATH ?? "").trim();
  const candidates = [
    envPath || null,
    // Project-local (recommended)
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.otf"),
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.ttf"),
    path.join(process.cwd(), "assets/fonts/NotoSansCJKkr-Regular.otf"),
    path.join(process.cwd(), "assets/fonts/NotoSansCJKkr-Regular.ttf"),
    // Common system paths (if installed)
    "/usr/share/fonts/opentype/noto/NotoSansCJKkr-Regular.otf",
    "/usr/share/fonts/opentype/noto/NotoSansKR-Regular.otf",
    "/usr/share/fonts/truetype/noto/NotoSansKR-Regular.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/nanum/NanumBarunGothic.ttf"
  ].filter((p): p is string => !!p);

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export async function renderReportPdfBuffer(args: {
  title: string;
  stats: AnalysisStats;
  suggestions: Suggestions;
  meta?: { filename?: string | null; createdAt?: string };
  requireKoreanFont?: boolean;
}): Promise<Buffer> {
  const { title, stats, suggestions, meta } = args;

  const doc = new PDFDocument({
    size: "A4",
    margin: 48,
    info: { Title: title }
  });

  const chunks: Buffer[] = [];
  doc.on("data", (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));

  const koFontPath = findKoreanFontPath();
  if (!koFontPath && (args.requireKoreanFont ?? false)) {
    throw new Error(
      [
        "PDFKit 한글 폰트를 찾지 못했습니다.",
        "해결:",
        "1) 한글 폰트 파일을 assets/fonts/NotoSansKR-Regular.otf (또는 .ttf)에 추가",
        "2) 또는 REPORT_FONT_PATH 환경변수에 폰트 파일 경로 지정"
      ].join("\n")
    );
  }
  if (koFontPath) {
    // Without an embedded font that supports Hangul, Korean text will render as tofu.
    doc.registerFont("ko", koFontPath);
    doc.font("ko");
  }

  doc.fontSize(18).text(title, { underline: false });
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor("#444");
  line(doc, `파일: ${meta?.filename ?? "-"}`);
  line(doc, `생성일: ${meta?.createdAt ?? new Date().toISOString()}`);
  if (koFontPath) line(doc, `폰트: ${path.basename(koFontPath)}`);
  if (!koFontPath) line(doc, `폰트: (한글 폰트 없음) REPORT_FONT_PATH 또는 assets/fonts에 한글 폰트를 추가하세요.`);
  doc.fillColor("#000");
  doc.moveDown(0.8);

  doc.fontSize(13).text("요약", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  line(doc, `리뷰 수: ${stats.total}`);
  line(doc, `평균 별점: ${stats.avgRating === null ? "-" : stats.avgRating.toFixed(2)}`);
  line(doc, `긍정/중립/부정: ${pct(stats.positiveRatio)} / ${pct(stats.neutral / Math.max(1, stats.total))} / ${pct(stats.negativeRatio)}`);
  line(doc, `우선순위 점수: ${stats.priorityScore.toFixed(1)}`);
  if (stats.recentness?.hasDates) {
    line(doc, `최근 30일 비중: ${pct(stats.recentness.last30Share)} (최근30 부정비율: ${stats.recentness.last30NegativeRatio === null ? "-" : pct(stats.recentness.last30NegativeRatio)})`);
    line(doc, `최근 90일 비중: ${pct(stats.recentness.last90Share)}`);
  } else {
    line(doc, `최근성: 작성일 컬럼이 없어 약하게/고정값으로만 반영됨`);
  }
  doc.moveDown(0.6);

  doc.fontSize(13).text("부정 키워드 TOP10", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  if (!stats.negativeKeywordsTop10.length) {
    line(doc, "- (없음)");
  } else {
    for (const k of stats.negativeKeywordsTop10) line(doc, `- ${k.keyword} (${k.count})`);
  }
  doc.moveDown(0.6);

  doc.fontSize(13).text("문제 카테고리", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  for (const [cat, count] of Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1])) {
    line(doc, `- ${cat}: ${count}`);
  }
  doc.moveDown(0.8);

  doc.fontSize(13).text("개선 제안: 상세페이지 문구", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  for (const s of suggestions.detailPageCopy) line(doc, `- ${s}`);
  doc.moveDown(0.8);

  doc.fontSize(13).text("개선 제안: CS 응대 문구", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  for (const s of suggestions.csResponseTemplates) line(doc, `- ${s}`);
  doc.moveDown(0.8);

  doc.fontSize(13).text("FAQ 추천", { underline: true });
  doc.moveDown(0.4);
  doc.fontSize(11);
  for (const s of suggestions.faqRecommendations) line(doc, `- ${s}`);
  if (suggestions.notes?.length) {
    doc.moveDown(0.6);
    doc.fontSize(9).fillColor("#444");
    line(doc, `Notes: ${suggestions.notes.join(" / ")}`);
    doc.fillColor("#000");
  }

  doc.end();

  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
  });

  return Buffer.concat(chunks);
}
