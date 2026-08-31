/**
 * 리눅스용 다중 플랫폼 실시간 E2E — 실제 확장(dist)을 Chromium 에 로드하고,
 * 8개 신규 플랫폼(29CM·11번가·SSG·무신사·오늘의집·G마켓·컬리·옥션)의
 * 실제 상품 페이지에서 리뷰 수집 → popup 다운로드(CSV/XLSX)까지 검증한다.
 *
 * (e2e-extension.mjs 의 macOS/쿠팡 전용 흐름을 Linux + 전체 플랫폼으로 일반화)
 *
 * 사용법:
 *   node scripts/e2e-live-multi.mjs                # 자체 Chromium 기동 (임시 프로필, 쿠키 없음)
 *   REUSE_CDP=1 node scripts/e2e-live-multi.mjs    # 기존 9222 세션에 붙기 (로그인 세션/CDP 프로필)
 *   URL_AUCTION="...itemno=..." node ...            # 플랫폼별 URL 덮어쓰기 (URL_<KEY> 대문자)
 *   ONLY=gmarket,auction node ...                   # 대상 플랫폼 필터
 * 산출물: /tmp/rb-e2e/{platform}/reviews.{csv,xlsx,json}
 */
import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXT_DIR = resolve(root, "dist");
const PORT = Number(process.env.CDP_PORT ?? 9222);
const REUSE = process.env.REUSE_CDP === "1";
const PROFILE = `/tmp/rb-e2e-profile-${process.pid}`;
const OUT = "/tmp/rb-e2e";
const HISTORY_KEY = "rb_history";
const CHROME_BIN = process.env.CHROME_BIN ?? "/usr/bin/chromium";

// 플랫폼 매트릭스 — 상품 URL 은 각 어댑터 테스트 픽스처(실측 캡처)에서 가져온 실상품
const PLATFORMS = [
  { key: "29cm", label: "29CM", url: "https://www.29cm.co.kr/products/2632177", apiHint: "review-api.29cm.co.kr" },
  { key: "11st", label: "11번가", url: "https://www.11st.co.kr/products/9553196713", apiHint: "review-list" },
  { key: "ssg", label: "SSG닷컴", url: "https://www.ssg.com/item/itemView.ssg?itemId=1000827457933&siteNo=6004", apiHint: "ajaxItemCommentList" },
  { key: "musinsa", label: "무신사", url: "https://www.musinsa.com/products/6254168", apiHint: "api2/review" },
  { key: "ohou", label: "오늘의집", url: "https://store.ohou.se/goods/3609096", apiHint: "api/goods/reviews" },
  { key: "gmarket", label: "G마켓", url: "https://item.gmarket.co.kr/Item?goodsCode=4814731104", apiHint: "Review/Text" },
  { key: "kurly", label: "컬리", url: "https://www.kurly.com/goods/1002458801", apiHint: "product-review" },
  { key: "auction", label: "옥션", url: "https://itempage3.auction.co.kr/DetailView.aspx?itemno=F287965040", apiHint: "GetReviewList" }
  // [2026-08-31 실측] www.auction.co.kr/DetailView.aspx?itemno=… 는 아이템 소멸 시 Http404 로 리다이렉트된다
  // (기존 fixture F361333759 포함). 라이브 아이템은 itempage3.auction.co.kr 직접 접근으로만 열린다.
];

// unpacked 확장 ID = 경로 SHA-256 → a-p 매핑 (Chrome 알고리즘, e2e-extension.mjs 와 동일)
const hart = createHash("sha256").update(EXT_DIR).digest("hex");
const EXT_ID = hart
  .slice(0, 32)
  .split("")
  .map((c) => String.fromCharCode(97 + parseInt(c, 16)))
  .join("");
console.log("EXT_ID:", EXT_ID, "| CHROME:", CHROME_BIN);

let chrome = null;
if (!REUSE) {
  rmSync(PROFILE, { recursive: true, force: true });
  try { execSync(`pkill -f "remote-debugging-port=${PORT}" || true`); } catch { /* no match */ }
  await new Promise((r) => setTimeout(r, 1200));
  chrome = spawn(
    CHROME_BIN,
    [
      `--user-data-dir=${PROFILE}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      "--disable-component-update",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      // Hyprland: --class=cdpchrome 이어야 hyprland.lua 규칙(no_initial_focus, ws 2 silent)이 걸린다. 없으면 포커스 뺏김.
      "--class=cdpchrome",
      `--remote-debugging-port=${PORT}`,
      `--load-extension=${EXT_DIR}`,
      `--disable-extensions-except=${EXT_DIR}`,
      "about:blank"
    ],
    { stdio: "ignore", detached: true }
  );
  console.log("chrome pid:", chrome.pid);
} else {
  console.log(`REUSE_CDP=1 — 기존 ${PORT} 세션에 붙음 (확장·로그인이 그 세션에 있어야 함)`);
}

let browser = null;
for (let i = 0; i < 40 && !browser; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  } catch { /* not ready */ }
}
if (!browser) { console.error("Chrome CDP 연결 실패"); process.exit(2); }
const ctx = browser.contexts()[0];

// 확장 로드 확인
const chk = await ctx.newPage();
let extLoaded = false;
for (let i = 0; i < 10 && !extLoaded; i++) {
  await chk.goto("chrome://extensions-internals/", { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
  await chk.waitForTimeout(800);
  extLoaded = await chk.evaluate((id) => document.body.innerText.includes(id), EXT_ID).catch(() => false);
}
console.log("extension loaded:", extLoaded);

async function findWorker() {
  for (let i = 0; i < 20; i++) {
    const w = ctx.serviceWorkers().find((x) => x.url().includes(EXT_ID));
    if (w) return w;
    await new Promise((r) => setTimeout(r, 500));
  }
  return null;
}

async function wakeWorker() {
  // localhost externally_connectable 로 SW 강제 기동 (콜드 스타트 대비)
  await ctx.route("http://localhost:9876/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html><body>rb</body></html>" })
  ).catch(() => {});
  const wake = await ctx.newPage();
  await wake.goto("http://localhost:9876/", { waitUntil: "domcontentloaded" }).catch(() => {});
  await wake.waitForTimeout(1200);
  await wake
    .evaluate((extId) => new Promise((res) => chrome.runtime.sendMessage(extId, { type: "PULL_REPORT" }, () => res(true))), EXT_ID)
    .catch(() => {});
  await wake.close().catch(() => {});
}

function looksBlocked(pageTitle, bodyText) {
  const t = (pageTitle || "").toLowerCase();
  const b = (bodyText || "").toLowerCase();
  const markers = ["시스템오류", "에러 페이지", "403", "404", "access denied", "자동화된", "잠시 후 다시", "접근", "차단", "로그인이 필요", "forbidden", "not found", "해당 상품을 찾을 수"];
  return markers.some((m) => t.includes(m) || b.includes(m));
}

const results = [];
const ONLY = (process.env.ONLY ?? "").split(",").map((s) => s.trim()).filter(Boolean);
for (const p of PLATFORMS) {
  if (ONLY.length && !ONLY.includes(p.key)) continue;
  const url = process.env[`URL_${p.key.toUpperCase()}`] ?? p.url;
  console.log(`\n===== ${p.label} (${p.key}) — ${url.slice(0, 90)} =====`);
  const outDir = `${OUT}/${p.key}`;
  mkdirSync(outDir, { recursive: true });
  const entry = { ...p, collected: 0, images: 0, csvRows: 0, csvColumns: 0, xlsxBytes: 0, status: "?" };

  // ① 상품 페이지 오픈 (재시도)
  const prodPage = await ctx.newPage();
  const apiReqs = [];
  prodPage.on("request", (req) => {
    if (p.apiHint && req.url().includes(p.apiHint)) apiReqs.push(req.method() + " " + req.url().slice(0, 110));
  });
  let pageOk = false;
  let title = "";
  for (let i = 0; i < 3 && !pageOk; i++) {
    await prodPage.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
    await prodPage.waitForTimeout(4000);
    title = await prodPage.title().catch(() => "");
    const body = await prodPage.evaluate(() => document.body?.innerText?.slice(0, 400) ?? "").catch(() => "");
    const hostOk = await prodPage.evaluate((h) => new URL(location.href).hostname === h, new URL(url).hostname).catch(() => false);
    pageOk = hostOk && !looksBlocked(title, body);
    if (!pageOk) console.log(`  페이지 로드 재시도 ${i + 1} — title: "${title.slice(0, 60)}"`);
  }
  if (!pageOk) {
    console.log("  ❌ 상품 페이지 차단/불가 —", title.slice(0, 80));
    entry.status = "BLOCKED";
    results.push(entry);
    await prodPage.close().catch(() => {});
    continue;
  }
  console.log("  상품 페이지 ok —", title.slice(0, 70));

  // ② SW 확보
  let worker = await findWorker();
  if (!worker) { await wakeWorker(); worker = await findWorker(); }
  if (!worker) {
    console.log("  ❌ SW 를 찾지 못함");
    entry.status = "FAIL_NO_SW";
    results.push(entry);
    await prodPage.close().catch(() => {});
    continue;
  }

  // ③ 이전 히스토리 제거 + popup 탭을 플랫폼마다 신규 생성 (리로드 금지 — DONE 브로드캐스트를
  //    실시간 수신해야 결과 패널이 렌더링된다. 리로드하면 상태가 리셋되어 다운로드 버튼이 사라진다)
  await worker.evaluate((k) => chrome.storage.local.remove(k), HISTORY_KEY).catch(() => {});
  for (const pg of ctx.pages().filter((x) => x.url().includes("popup.html"))) await pg.close().catch(() => {});
  await worker.evaluate((url) => new Promise((res) => chrome.tabs.create({ url }, (t) => res(!!t))), `chrome-extension://${EXT_ID}/popup.html`).catch(() => {});
  let popupTab = null;
  for (let i = 0; i < 10 && !popupTab; i++) {
    popupTab = ctx.pages().find((pg) => pg.url().includes("popup.html")) ?? null;
    if (!popupTab) await new Promise((r) => setTimeout(r, 500));
  }
  if (!popupTab) {
    console.log("  ❌ popup 탭 생성 실패");
    entry.status = "FAIL_NO_POPUP";
    results.push(entry);
    await prodPage.close().catch(() => {});
    continue;
  }
  await new Promise((r) => setTimeout(r, 2500));

  await prodPage.bringToFront().catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  // ④ 수집 시작 (WAF 류 일시 오류는 1회 재시도)
  let reviews = null;
  let errorText = null;
  for (let attempt = 1; attempt <= 2 && !reviews; attempt++) {
    const tabId = await worker.evaluate(
      (host) => new Promise((res) => chrome.tabs.query({}, (tabs) => {
        const t = tabs.find((tb) => tb.url?.includes(host));
        res(t?.id ?? -1);
      })),
      new URL(url).hostname
    ).catch(() => -1);
    if (tabId < 0) {
      console.log("  ❌ 상품 탭 id 못 찾음");
      entry.status = "FAIL_NO_TAB";
      errorText = "NO_TAB";
      break;
    }

    const ack = await worker.evaluate(
      (id) => new Promise((res) => chrome.tabs.sendMessage(id, { type: "COLLECT_START", maxItems: 30 }, (resp) => res(!chrome.runtime.lastError && !!resp))),
      tabId
    ).catch(() => false);
    console.log(`  COLLECT_START ack: ${ack} (시도 ${attempt})`);

    // ⑤ 수집 완료 대기 (rb_history)
    reviews = null;
    errorText = null;
    for (let i = 0; i < 150 && !reviews && !errorText; i++) {
      await new Promise((r) => setTimeout(r, 1000));
      reviews = await worker.evaluate((k) => chrome.storage.local.get(k).then((d) => {
        const arr = d[k];
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const r = arr[0]?.reviews;
        return Array.isArray(r) && r.length > 0 ? r : null;
      }), HISTORY_KEY).catch(() => null);
      if (!reviews) {
        errorText = await popupTab.evaluate(() => {
          const err = document.getElementById("error-text");
          return err && !err.closest(".hidden") ? err.textContent : null;
        }).catch(() => null);
      }
    }
    if (!reviews && attempt === 1 && errorText?.includes("네트워크")) {
      console.log(`  ⚠️ 일시 네트워크 오류 — 페이지 리로드 후 재시도: ${errorText}`);
      await worker.evaluate((k) => chrome.storage.local.remove(k), HISTORY_KEY).catch(() => {});
      await prodPage.reload({ waitUntil: "domcontentloaded" }).catch(() => {});
      await prodPage.waitForTimeout(4000);
    }
  }
  if (!reviews) {
    console.log("  ❌ 수집 실패 — popup 오류:", errorText ?? "(없음)");
    entry.status = "FAIL_COLLECT";
    results.push(entry);
    await prodPage.close().catch(() => {});
    await popupTab.close().catch(() => {});
    continue;
  }
  const withImages = reviews.filter((r) => (r.imageUrls?.length ?? 0) > 0);
  entry.collected = reviews.length;
  entry.images = withImages.length;
  console.log(`  ✅ 수집: ${reviews.length}개 (이미지 ${withImages.length}개)`);
  console.log("  api 요청:", apiReqs.length ? apiReqs.slice(0, 4) : "(표시용 필터 무적중)");
  for (const r of reviews.slice(0, 2)) console.log("   -", String(r.text ?? "").replace(/\s+/g, " ").slice(0, 40), "| ★", r.rating);

  // ⑥ popup 다운로드 버튼 클릭 (XLSX → CSV) — 결과 패널 렌더링을 폴링으로 대기
  await popupTab.bringToFront().catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));
  let dlErr = null;
  let dlBtnVisible = false;
  for (let i = 0; i < 20 && !dlBtnVisible; i++) {
    dlBtnVisible = await popupTab.locator("#dl-xlsx").isVisible().catch(() => false);
    if (!dlBtnVisible) await new Promise((r) => setTimeout(r, 1000));
  }
  if (!dlBtnVisible) {
    const popupState = await popupTab.evaluate(() => ({
      url: location.href,
      body: (document.body?.innerText ?? "").slice(0, 160).replace(/\n+/g, " | ")
    })).catch(() => ({}));
    dlErr = `dl-btn not visible (popup: ${JSON.stringify(popupState)})`;
  } else {
    try {
      const [dx] = await Promise.all([
        popupTab.waitForEvent("download", { timeout: 25000 }),
        popupTab.locator("#dl-xlsx").click({ timeout: 8000 })
      ]);
      await dx.saveAs(`${outDir}/reviews.xlsx`);
      entry.xlsxBytes = existsSync(`${outDir}/reviews.xlsx`) ? readFileSync(`${outDir}/reviews.xlsx`).length : 0;
    } catch (e) { dlErr = `xlsx: ${String(e).slice(0, 90)}`; }
    if (!dlErr) {
      try {
        const [dc] = await Promise.all([
          popupTab.waitForEvent("download", { timeout: 25000 }),
          popupTab.locator("#dl-csv").click({ timeout: 8000 })
        ]);
        await dc.saveAs(`${outDir}/reviews.csv`);
        const csv = readFileSync(`${outDir}/reviews.csv`, "utf8");
        const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
        const header = lines[0] ?? "";
        entry.csvColumns = header.split(",").length;
        entry.csvRows = Math.max(0, lines.length - 1);
        console.log(`  CSV: ${entry.csvRows}행 / ${entry.csvColumns}열 | 헤더: ${header.slice(0, 60)}...`);
      } catch (e) { dlErr = `csv: ${String(e).slice(0, 90)}`; }
    }
  }

  writeFileSync(`${outDir}/reviews.json`, JSON.stringify({ platform: p.key, title, reviews }, null, 2));
  entry.status = dlErr ? `PARTIAL(${dlErr})` : "OK";
  console.log("  XLSX bytes:", entry.xlsxBytes, "| 다운로드 상태:", entry.status);
  results.push(entry);
  await prodPage.close().catch(() => {});
  await popupTab.close().catch(() => {});
}

console.log("\n==================== 결과 요약 ====================");
console.log("플랫폼      | 상태   | 수집 | 이미지 | CSV행/열   | XLSX(bytes)");
for (const r of results) {
  console.log(
    `${r.label.padEnd(7)}  | ${String(r.status).padEnd(12)} | ${String(r.collected).padStart(4)} | ${String(r.images).padStart(4)} | ${String(r.csvRows).padStart(4)}/${String(r.csvColumns).padEnd(4)} | ${r.xlsxBytes}`
  );
}

await browser.close().catch(() => {});
if (!REUSE) { try { process.kill(chrome.pid, "SIGTERM"); } catch { /* gone */ } } else { console.log("REUSE 모드 — 붙은 세션 유지 (종료하지 않음)"); }
console.log("done ->", OUT);