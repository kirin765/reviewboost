import type { AnalysisStats, Suggestions } from "@/lib/types";
import fs from "node:fs";
import path from "node:path";

function esc(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function findKoreanFontPath(): string | null {
  const envPath = (process.env.REPORT_FONT_PATH ?? "").trim();
  const candidates = [
    envPath || null,
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.otf"),
    path.join(process.cwd(), "assets/fonts/NotoSansKR-Regular.ttf"),
    path.join(process.cwd(), "assets/fonts/NotoSansCJKkr-Regular.otf"),
    path.join(process.cwd(), "assets/fonts/NotoSansCJKkr-Regular.ttf")
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

function fontFaceCss(): string {
  const fontPath = findKoreanFontPath();
  if (!fontPath) return "";
  try {
    const buf = fs.readFileSync(fontPath);
    const ext = path.extname(fontPath).toLowerCase();
    const mime = ext === ".otf" ? "font/otf" : "font/ttf";
    const fmt = ext === ".otf" ? "opentype" : "truetype";
    const b64 = buf.toString("base64");
    return `
    @font-face {
      font-family: 'RB-KO';
      src: url('data:${mime};base64,${b64}') format('${fmt}');
      font-weight: 400;
      font-style: normal;
    }`;
  } catch {
    return "";
  }
}

function safeNum(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "-";
  if (decimals === 0) return `${Math.round(value)}`;
  return value.toFixed(decimals);
}

function renderPercent(value: number): string {
  if (!Number.isFinite(value)) return "-";
  return `${Math.round(value * 100)}%`;
}

function recentText(recentness?: AnalysisStats["recentness"]): string {
  if (!recentness || !recentness.hasDates) {
    return "작성일이 없어 최근성 지표는 약하게 반영됩니다.";
  }

  return `최근 30일 리뷰 비중 ${renderPercent(recentness.last30Share)} / 최근 90일 리뷰 비중 ${renderPercent(
    recentness.last90Share
  )}`;
}

function renderListRows(items: Array<{ label: string; count?: number }>): string {
  if (items.length === 0) return `<p class="muted">데이터가 없습니다.</p>`;

  return items
    .map(
      (row) => `
      <li class="listItem">
        <span class="listText">${esc(row.label)}</span>
        <span class="listBadge">${row.count === undefined ? "N/A" : safeNum(row.count)}</span>
      </li>`
    )
    .join("");
}

function renderSimpleList(items: string[]): string {
  if (items.length === 0) {
    return `<p class="muted">현재 제안 데이터가 없습니다.</p>`;
  }

  return items.map((item) => `<li>${esc(item)}</li>`).join("");
}

function renderMetaList(values: string[]): string {
  if (values.length === 0) return `<span class="muted">-</span>`;
  return values.map((value) => `<li>${esc(value)}</li>`).join(" · ");
}

export function renderReportHtml(args: {
  title: string;
  stats: AnalysisStats;
  suggestions: Suggestions;
  meta?: { filename?: string | null; createdAt?: string };
}) {
  const { title, stats, suggestions, meta } = args;
  const ff = fontFaceCss();

  const fileName = esc(meta?.filename ?? "-");
  const createdAt = esc(meta?.createdAt ?? new Date().toISOString());
  const ratingSafe = stats.avgRating === null ? "-" : safeNum(stats.avgRating, 2);
  const hasRating = stats.avgRating !== null;
  const topCategories = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);

  const kpiCardsHtml = `
    <article class="panel kpiCard">
      <p class="kpiLabel">리뷰 수</p>
      <p class="kpiValue">${safeNum(stats.total)}</p>
      <p class="kpiHint">총 수집 리뷰</p>
    </article>
    <article class="panel kpiCard">
      <p class="kpiLabel">평균 별점</p>
      <p class="kpiValue">${ratingSafe}</p>
      <p class="kpiHint">${hasRating ? "5점 만점" : "데이터 없음"}</p>
    </article>
    <article class="panel kpiCard">
      <p class="kpiLabel">부정 비율</p>
      <p class="kpiValue">${renderPercent(stats.negativeRatio)}</p>
      <p class="kpiHint">전체 대비 부정 리뷰</p>
    </article>
    <article class="panel kpiCard">
      <p class="kpiLabel">우선순위 점수</p>
      <p class="kpiValue">${safeNum(stats.priorityScore, 1)}</p>
      <p class="kpiHint">개선 우선순위</p>
    </article>`;

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    :root {
      --ink: #0f172a;
      --muted: #64748b;
      --line: #e2e8f0;
      --soft: #f1f5f9;
      --panel: #ffffff;
      --accent: #2563eb;
      --accent-strong: #1d4ed8;
      --warn: #d97706;
      --ok: #059669;
    }

    * {
      box-sizing: border-box;
    }

    ${ff}

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      background: var(--soft);
      color: var(--ink);
      font-family: ${ff ? "'RB-KO', " : ""}"Segoe UI", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans KR", "Helvetica Neue", Arial, sans-serif;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      min-height: 100vh;
    }

    .page {
      width: min(100% - 56px, 960px);
      margin: 0 auto;
      padding: 24px 0 32px;
    }

    .panel {
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel);
      box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
      padding: 14px;
    }

    .hero {
      background: linear-gradient(180deg, #f8fbff, #ffffff);
      border: 1px solid #dbeafe;
      margin-bottom: 12px;
    }

    .heroTop {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      flex-wrap: wrap;
    }

    .eyebrow {
      margin: 0 0 8px;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      font-weight: 700;
    }

    .reportTitle {
      margin: 0;
      font-size: 34px;
      line-height: 1.15;
      letter-spacing: -0.02em;
    }

    .subTitle {
      margin: 4px 0 0;
      color: var(--muted);
      font-size: 12px;
    }

    .metaTags {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 14px;
    }

    .metaTag {
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      padding: 6px 10px;
      background: #edf2ff;
      color: #1d4ed8;
      border: 1px solid #bfdbfe;
      font-size: 11px;
      font-weight: 600;
    }

    .kpiGrid {
      margin-bottom: 12px;
      display: grid;
      grid-template-columns: repeat(4, minmax(120px, 1fr));
      gap: 10px;
    }

    .kpiCard {
      padding: 12px;
      background: #ffffff;
    }

    .kpiCard:first-of-type {
      border-left: 3px solid var(--accent);
    }

    .kpiCard:nth-of-type(2) {
      border-left: 3px solid #6366f1;
    }

    .kpiCard:nth-of-type(3) {
      border-left: 3px solid var(--warn);
    }

    .kpiCard:nth-of-type(4) {
      border-left: 3px solid var(--ok);
    }

    .kpiLabel {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
      min-height: 15px;
    }

    .kpiValue {
      margin: 6px 0 4px;
      font-size: 27px;
      font-weight: 800;
      letter-spacing: -0.02em;
      line-height: 1;
    }

    .kpiHint {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
    }

    .panelRow {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 12px;
    }

    h2 {
      margin: 0 0 9px;
      font-size: 16px;
      letter-spacing: -0.01em;
    }

    .sectionInfo {
      margin-top: 0;
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 10px;
    }

    ul.listBlock {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 8px;
    }

    .listItem {
      display: grid;
      grid-template-columns: 1fr auto;
      align-items: center;
      gap: 10px;
      background: #f8fafc;
      border: 1px solid var(--line);
      border-radius: 10px;
      padding: 7px 10px;
      min-height: 34px;
    }

    .listText {
      color: #0f172a;
      font-size: 12px;
      line-height: 1.4;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }

    .listBadge {
      font-size: 10px;
      color: #1d4ed8;
      background: #e0e7ff;
      border-radius: 999px;
      padding: 3px 8px;
      white-space: nowrap;
      font-weight: 700;
      border: 1px solid #dbeafe;
    }

    .plainList li {
      background: #f8fafc;
      border: 1px solid var(--line);
      border-radius: 10px;
      margin-bottom: 7px;
      padding: 9px 10px;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }

    .muted {
      margin: 0;
      color: var(--muted);
      font-size: 11px;
    }

    .notes {
      margin-top: 10px;
      background: #f8fafc;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      padding: 9px 11px;
      font-size: 11px;
      color: #334155;
      display: grid;
      gap: 6px;
      white-space: pre-wrap;
      word-break: keep-all;
      overflow-wrap: anywhere;
    }

    .barRow {
      margin-top: 8px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .barLine {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #334155;
    }

    .track {
      margin-top: 5px;
      width: 100%;
      height: 8px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
      position: relative;
    }

    .fill {
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--accent), var(--accent-strong));
    }

    .divider {
      border-top: 1px solid #e2e8f0;
      margin: 10px 0 10px;
    }

    @media (max-width: 900px) {
      .page {
        width: calc(100% - 24px);
        padding-top: 12px;
      }

      .kpiGrid,
      .panelRow {
        grid-template-columns: 1fr;
      }

      .barRow {
        grid-template-columns: 1fr;
      }

      .heroTop {
        flex-direction: column;
        align-items: flex-start;
      }

      .reportTitle {
        font-size: 28px;
      }
    }

    @media print {
      @page {
        size: A4;
        margin: 12mm;
      }

      body {
        background: #ffffff;
      }

      .page {
        width: 100%;
        max-width: none;
        padding: 0;
      }

      .panel {
        break-inside: avoid;
      }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="panel hero">
      <div class="heroTop">
        <div>
          <p class="eyebrow">ReviewBoost Report</p>
          <h1 class="reportTitle">${esc(title)}</h1>
          <p class="subTitle">대시보드형 분석 리포트 · 파일: ${fileName}</p>
        </div>
        <p class="subTitle">${createdAt}</p>
      </div>
      <div class="metaTags">
        <span class="metaTag">총 리뷰: ${safeNum(stats.total)}</span>
        <span class="metaTag">긍정: ${safeNum(stats.positive)}</span>
        <span class="metaTag">부정: ${safeNum(stats.negative)}</span>
        <span class="metaTag">중립: ${safeNum(stats.neutral)}</span>
      </div>
    </header>

    <section class="panel kpiGrid">${kpiCardsHtml}</section>

    <section class="panel">
      <h2>지표 요약</h2>
      <p class="sectionInfo">최근성은 입력 데이터의 작성일을 바탕으로 계산합니다.</p>
      <div class="barRow">
        <div>
          <div class="barLine"><span>최근 30일 리뷰 비중</span><span>${renderPercent(stats.recentness?.last30Share || 0)}</span></div>
          <div class="track"><div class="fill" style="width:${Math.max(0, Math.min(100, Math.round((stats.recentness?.last30Share || 0) * 100)))}%;"></div></div>
        </div>
        <div>
          <div class="barLine"><span>최근 90일 리뷰 비중</span><span>${renderPercent(stats.recentness?.last90Share || 0)}</span></div>
          <div class="track"><div class="fill" style="width:${Math.max(0, Math.min(100, Math.round((stats.recentness?.last90Share || 0) * 100)))}%;"></div></div>
        </div>
      </div>
      <p class="sectionInfo">${recentText(stats.recentness)}</p>
    </section>

    <section class="panelRow">
      <article class="panel">
        <h2>부정 키워드 Top 10</h2>
        <p class="sectionInfo">부정 리뷰에서 자주 등장한 키워드</p>
        <ul class="listBlock">${renderListRows(
          stats.negativeKeywordsTop10.map((item) => ({ label: item.keyword, count: item.count }))
        )}</ul>
      </article>
      <article class="panel">
        <h2>문제 카테고리</h2>
        <p class="sectionInfo">카테고리별 이슈 분포</p>
        <ul class="listBlock">
          ${
            topCategories.length === 0
              ? '<p class="muted">카테고리 데이터가 없습니다.</p>'
              : topCategories
                  .map(
                    ([c, n]) => `<li class="listItem"><span class="listText">${esc(c)}</span><span class="listBadge">${safeNum(n)}</span></li>`
                  )
                  .join("")
          }
        </ul>
      </article>
    </section>

    <section class="panelRow">
      <article class="panel">
        <h2>개선 제안(상세페이지)</h2>
        <p class="sectionInfo">우선 반영이 필요한 상세페이지 문구</p>
        <ul class="listBlock plainList">${renderSimpleList(suggestions.detailPageCopy)}</ul>
      </article>
      <article class="panel">
        <h2>개선 제안(CS 응대)</h2>
        <p class="sectionInfo">CS 대응용 답변 템플릿</p>
        <ul class="listBlock plainList">${renderSimpleList(suggestions.csResponseTemplates)}</ul>
      </article>
    </section>

    <section class="panel">
      <h2>개선 제안(FAQ)</h2>
      <ul class="listBlock plainList">${renderSimpleList(suggestions.faqRecommendations)}</ul>
    </section>

    <section class="panel">
      <h2>Notes</h2>
      ${
        suggestions.notes.length === 0
          ? '<p class="muted">추가 메모가 없습니다.</p>'
          : `<div class="notes">${renderMetaList(suggestions.notes)}</div>`
      }
    </section>

    <p class="subTitle">분석은 /dashboard와 동일한 섹션 기반 구조로 정렬되었습니다.</p>
    <div class="divider"></div>
  </main>
</body>
</html>`;
}
