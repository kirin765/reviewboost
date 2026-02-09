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
    @font-face{
      font-family: 'RB-KO';
      src: url('data:${mime};base64,${b64}') format('${fmt}');
      font-weight: 400;
      font-style: normal;
    }`;
  } catch {
    return "";
  }
}

export function renderReportHtml(args: {
  title: string;
  stats: AnalysisStats;
  suggestions: Suggestions;
  meta?: { filename?: string | null; createdAt?: string };
}) {
  const { title, stats, suggestions, meta } = args;
  const cats = Object.entries(stats.categoryCounts).sort((a, b) => b[1] - a[1]);
  const kw = stats.negativeKeywordsTop10;
  const ff = fontFaceCss();

  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(title)}</title>
  <style>
    :root { --ink:#101827; --muted:#52606d; --line:#e6e8ee; --accent:#0ea5e9; --warn:#f59e0b; --ok:#22c55e; }
    *{ box-sizing:border-box; }
    ${ff}
    body{ margin:0; font-family: ${ff ? "'RB-KO'," : ""} ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; color:var(--ink); }
    .page{ padding:40px 44px; }
    h1{ margin:0 0 8px; font-size:24px; letter-spacing:-0.02em; }
    .meta{ color:var(--muted); font-size:12px; margin-bottom:18px; }
    .grid{ display:grid; grid-template-columns: 1fr 1fr; gap:14px; }
    .card{ border:1px solid var(--line); border-radius:14px; padding:14px; }
    .kpis{ display:grid; grid-template-columns: repeat(4, 1fr); gap:10px; }
    .kpi{ border:1px solid var(--line); border-radius:12px; padding:10px; }
    .kpi .label{ color:var(--muted); font-size:11px; }
    .kpi .value{ font-size:16px; font-weight:800; margin-top:3px; }
    .bar{ height:10px; background:#f2f4f7; border-radius:999px; overflow:hidden; }
    .bar > div{ height:100%; background:linear-gradient(90deg, var(--warn), #fb7185); }
    h2{ font-size:13px; margin:0 0 10px; text-transform: uppercase; letter-spacing:0.08em; color:#344154; }
    ul{ margin:0; padding-left:18px; }
    li{ margin:6px 0; line-height:1.5; }
    .small{ font-size:12px; color:var(--muted); }
    .row{ display:flex; justify-content:space-between; gap:10px; border-top:1px dashed var(--line); padding:8px 0; }
    .row:first-child{ border-top:0; padding-top:0; }
    .tag{ font-size:11px; padding:4px 8px; border:1px solid var(--line); border-radius:999px; color:var(--muted); }
  </style>
</head>
<body>
  <div class="page">
    <h1>${esc(title)}</h1>
    <div class="meta">
      파일: <strong>${esc(meta?.filename ?? "-")}</strong>
      &nbsp;|&nbsp; 생성일: <strong>${esc(meta?.createdAt ?? new Date().toISOString())}</strong>
    </div>

    <div class="card" style="margin-bottom:14px;">
      <h2>요약</h2>
      <div class="kpis">
        <div class="kpi"><div class="label">리뷰 수</div><div class="value">${stats.total}</div></div>
        <div class="kpi"><div class="label">평균 별점</div><div class="value">${stats.avgRating === null ? "-" : stats.avgRating.toFixed(2)}</div></div>
        <div class="kpi"><div class="label">부정 비율</div><div class="value">${Math.round(stats.negativeRatio * 100)}%</div></div>
        <div class="kpi"><div class="label">우선순위 점수</div><div class="value">${stats.priorityScore.toFixed(1)}</div></div>
      </div>
      ${
        stats.recentness?.hasDates
          ? `<div class="small" style="margin-top:10px;">
              최근성: 최근 30일 리뷰 비중 ${Math.round((stats.recentness.last30Share ?? 0) * 100)}% · 최근 90일 비중 ${Math.round((stats.recentness.last90Share ?? 0) * 100)}%
            </div>`
          : `<div class="small" style="margin-top:10px;">작성일 컬럼이 없어서 최근성 점수는 제외(또는 약하게) 반영되었습니다.</div>`
      }
      <div style="margin-top:10px;">
        <div class="small">부정 비율</div>
        <div class="bar"><div style="width:${Math.round(stats.negativeRatio * 100)}%"></div></div>
      </div>
    </div>

    <div class="grid">
      <div class="card">
        <h2>부정 키워드 Top10</h2>
        ${kw.length === 0 ? `<div class="small">추출된 키워드가 없습니다.</div>` : kw
          .map((k) => `<div class="row"><div>${esc(k.keyword)}</div><div class="tag">${k.count}</div></div>`)
          .join("")}
      </div>
      <div class="card">
        <h2>문제 카테고리</h2>
        ${cats
          .map(([c, n]) => `<div class="row"><div>${esc(c)}</div><div class="tag">${n}</div></div>`)
          .join("")}
        <div class="small" style="margin-top:8px;">배송/품질/가격/사용성/CS + 기타</div>
      </div>
    </div>

    <div class="grid" style="margin-top:14px;">
      <div class="card">
        <h2>상세페이지 수정 문구</h2>
        <ul>${suggestions.detailPageCopy.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>
      <div class="card">
        <h2>CS 응대 문구</h2>
        <ul>${suggestions.csResponseTemplates.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      </div>
    </div>

    <div class="card" style="margin-top:14px;">
      <h2>FAQ 추천</h2>
      <ul>${suggestions.faqRecommendations.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>
      ${suggestions.notes.length ? `<div class="small" style="margin-top:10px;">${suggestions.notes.map(esc).join(" / ")}</div>` : ""}
    </div>
  </div>
</body>
</html>`;
}
