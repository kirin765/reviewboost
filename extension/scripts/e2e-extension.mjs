/**
 * 진짜 E2E: 이미 확장이 설치돼 있는 CDP 프로필(chrome-cdp-profile)로 Chrome 을
 * 재시작해 현재 dist 를 로드한 뒤,
 * ① localhost(externally_connectable) 페이지로 MV3 SW 를 깨우고
 * ② SW 가 popup.html 을 탭으로 열고
 * ③ 실제 쿠팡 상품 페이지에서 COLLECT_START 를 보내고
 * ④ popup 탭의 실제 다운로드 버튼(#dl-xlsx / #dl-csv)을 클릭해
 * ⑤ 내려받은 파일이 공식 스마트스토어 25열 폼인지 검증한다.
 *
 * 사용법: node scripts/e2e-extension.mjs
 * 산출물: /tmp/rb-e2e/reviews.xlsx, /tmp/rb-e2e/reviews.csv, /tmp/rb-e2e/reviews.json
 */
import { execSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXT_DIR = resolve(root, "dist");
const PORT = 9222;
const PROFILE = "/Users/kiwankim/chrome-cdp-profile";
const OUT_DIR = "/tmp/rb-e2e";
const HISTORY_KEY = "rb_history";

const LIVE_URL = process.env.LIVE_URL ?? "https://www.coupang.com/vp/products/9523158816?vendorItemId=95342824639";
const LIVE_HOST = new URL(LIVE_URL).hostname;
// 탭 찾기용 구분자: 쿠팡 /vp/products, 스마트스토어 /{store}/products
const TAB_MATCH = LIVE_HOST.includes("coupang")
  ? "coupang.com/vp/products"
  : LIVE_URL.slice(0, LIVE_URL.lastIndexOf("/"));

mkdirSync(OUT_DIR, { recursive: true });

// unpacked 확장 ID = 경로 SHA-256 을 a-p 로 매핑한 32자
const hashHex = createHash("sha256").update(EXT_DIR).digest("hex");
const EXT_ID = hashHex
  .slice(0, 32)
  .split("")
  .map((c) => String.fromCharCode(97 + parseInt(c, 16)))
  .join("");
console.log("EXT_ID:", EXT_ID);

const KEEP_CHROME = process.env.KEEP_CHROME === "1";
let chrome = null;
if (KEEP_CHROME) {
  // 이미 떠 있는 9222 세션 재사용 (네이버 봇 감지가 새 세션마다 다시 걸리는 것을 피함)
  const ok = await new Promise((r) => {
    import("node:net").then((net) => {
      const s = net.connect(PORT, "127.0.0.1");
      s.once("connect", () => { s.destroy(); r(true); });
      s.once("error", () => r(false));
    });
  });
  if (ok) {
    console.log("기존 9222 세션 재사용");
  } else {
    console.error("KEEP_CHROME=1 인데 9222 세션이 없습니다.");
    process.exit(9);
  }
} else {
  // 기존 CDP 프로필 인스턴스 정리 후 재시작 (설치된 unpacked 확장이 현재 dist 를 로드)
  try {
    execSync(`pkill -f "chrome-cdp-profile" || true`);
  } catch {
    /* no match */
  }
  await new Promise((r) => setTimeout(r, 1500));
  chrome = spawn(
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    [
      `--user-data-dir=${PROFILE}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-background-networking",
      `--remote-debugging-port=${PORT}`,
      "about:blank"
    ],
    { stdio: "ignore", detached: true }
  );
  console.log("chrome pid:", chrome.pid);
}

let browser = null;
for (let i = 0; i < 40 && !browser; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  } catch {
    /* not ready */
  }
}
if (!browser) {
  console.error("Chrome CDP 연결 실패");
  process.exit(2);
}

const ctx = browser.contexts()[0];

// 확장이 로드됐는지 확인
const chk = await ctx.newPage();
let extLoaded = false;
for (let i = 0; i < 10 && !extLoaded; i++) {
  await chk
    .goto("chrome://extensions-internals/", { waitUntil: "domcontentloaded", timeout: 15000 })
    .catch(() => {});
  await chk.waitForTimeout(800);
  extLoaded = await chk
    .evaluate((id) => document.body.innerText.includes(id), EXT_ID)
    .catch(() => false);
}
console.log("extension loaded:", extLoaded);
if (!extLoaded) {
  console.error("확장이 로드되지 않았습니다.");
  process.exit(3);
}

// ① 상품 페이지를 먼저 연다 — SW 가 뜨거운 상태에서 페이지를 로드하면 캡처 훅이
//    페이지 초기화 중에 주입돼 네이버가 "시스템오류" 페이지를 내려준다(실측).
//    실제 사용자 흐름(상품 먼저, SW 콜드)과 동일한 순서로 진행한다.
const prodPage = await ctx.newPage();
let ok = false;
for (let i = 0; i < 10 && !ok; i++) {
  await prodPage.goto(LIVE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await prodPage.waitForTimeout(5500);
  ok = await prodPage
    .evaluate((host) => {
      const u = location.href;
      const t = document.title || "";
      return (
        new URL(u).hostname === host &&
        !u.includes("nid.naver.com") &&
        !u.includes("banned") &&
        !t.includes("에러") &&
        !t.includes("시스템오류") &&
        !document.body.innerText.includes("자동화된")
      );
    }, LIVE_HOST)
    .catch(() => false);
  if (!ok) console.log(`  페이지 로드 재시도 ${i + 1}...`);
}
console.log("상품 페이지 ok:", ok, "->", prodPage.url());
if (!ok) process.exit(6);

// ② SW 확보 — 상품 페이지의 콘텐츠 스크립트가 INSTALL_HOOK 을 보내면서 자연 기동됨
let worker = null;
for (let i = 0; i < 20 && !worker; i++) {
  worker = ctx.serviceWorkers().find((w) => w.url().includes(EXT_ID)) ?? null;
  if (!worker) await new Promise((r) => setTimeout(r, 500));
}
if (!worker) {
  // 콜드 스타트 지연 대비 localhost externally_connectable 로 강제 기동
  await ctx.route("http://localhost:9876/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><html><body>rb</body></html>" })
  );
  const wakePage = await ctx.newPage();
  await wakePage.goto("http://localhost:9876/");
  await wakePage.waitForTimeout(1200);
  await wakePage
    .evaluate(
      (extId) => new Promise((res) => chrome.runtime.sendMessage(extId, { type: "PULL_REPORT" }, () => res(true))),
      EXT_ID
    )
    .catch(() => {});
  for (let i = 0; i < 20 && !worker; i++) {
    worker = ctx.serviceWorkers().find((w) => w.url().includes(EXT_ID)) ?? null;
    if (!worker) await new Promise((r) => setTimeout(r, 500));
  }
}
if (!worker) {
  console.error("SW 를 찾지 못했습니다.");
  process.exit(4);
}
console.log("sw:", worker.url());

// 이전 실행의 rb_history 가 남아 있으면 새 수집과 구분이 안 되므로 비운다
await worker.evaluate((key) => chrome.storage.local.remove(key), HISTORY_KEY).catch(() => {});
console.log("rb_history cleared");

// ③ SW 가 popup.html 을 탭으로 연다 (extension-initiated navigation 허용)
const popupCreated = await worker.evaluate(
  (url) =>
    new Promise((res) => {
      chrome.tabs.create({ url }, (tab) => res(!!tab && !!tab.id));
    }),
  `chrome-extension://${EXT_ID}/popup.html`
);
console.log("popup tab created:", popupCreated);
await new Promise((r) => setTimeout(r, 2500));

let popupTab = null;
for (let i = 0; i < 10 && !popupTab; i++) {
  popupTab = ctx.pages().find((p) => p.url().includes("popup.html")) ?? null;
  if (!popupTab) await new Promise((r) => setTimeout(r, 500));
}
if (!popupTab) {
  console.error("popup 탭을 찾지 못했습니다. pages:", ctx.pages().map((p) => p.url().slice(0, 70)));
  process.exit(5);
}
console.log("popup 탭:", popupTab.url());

// popup 이 활성 탭(상품 페이지)을 바라보도록: 상품 탭을 앞으로 + popup 탭 리로드
await prodPage.bringToFront();
await popupTab.reload({ waitUntil: "load" }).catch(() => {});
await new Promise((r) => setTimeout(r, 2000));

// 리뷰 API 요청 감시
const reviewReqs = [];
prodPage.on("request", (req) => {
  if (req.url().includes("/contents/reviews/")) reviewReqs.push(req.method() + " " + req.url().slice(0, 90));
});

// 실제 사용자처럼 스크롤 + "리뷰 전체보기" 클릭으로 리뷰 로드 유도
await prodPage.evaluate(() => {
  const el = document.querySelector('section[class*="review" i], div[class*="review" i], [id*="REVIEW"], button[class*="review" i]');
  el?.scrollIntoView?.({ block: "start" });
  window.scrollBy(0, 2000);
}).catch(() => {});
await new Promise((r) => setTimeout(r, 3000));
const clicked = await prodPage.evaluate(() => {
  const btn = Array.from(document.querySelectorAll("button, a")).find((b) => /리뷰\s*전체보기/.test((b.textContent || "").trim()));
  if (btn) { (btn).click(); return true; }
  return false;
}).catch(() => false);
console.log("리뷰 전체보기 클릭:", clicked);
await new Promise((r) => setTimeout(r, 5000));
const pre = await prodPage.evaluate(() => ({
  title: document.title.slice(0, 40),
  hookInstalled: !!window.__rbReviewCaptureInstalled,
  capture: document.documentElement.getAttribute("data-rb-review-capture")?.slice(0, 120) ?? null
})).catch(() => ({}));
console.log("pre-collect:", JSON.stringify(pre), "reqs:", reviewReqs.length ? reviewReqs : "(none)");

const tabId = await worker.evaluate(
  (urlPart) =>
    new Promise((resolvePromise) => {
      chrome.tabs.query({}, (tabs) => {
        const t = tabs.find((tb) => tb.url?.includes(urlPart));
        resolvePromise(t?.id ?? -1);
      });
    }),
  TAB_MATCH
);
console.log("coupang tabId:", tabId);
if (tabId < 0) process.exit(7);

const sent = await worker.evaluate(
  (id) =>
    new Promise((resolvePromise) => {
      chrome.tabs.sendMessage(id, { type: "COLLECT_START", maxItems: 60 }, (resp) => {
        resolvePromise(!chrome.runtime.lastError && !!resp);
      });
    }),
  tabId
);
console.log("COLLECT_START ack:", sent);

// DONE 대기 (rb_history 기록 또는 popup 오류)
// popup 이 DONE 을 받아 result pane 을 띄울 준비가 됐는지 확인 (수신 리스너는 항상 등록돼 있음)
await new Promise((r) => setTimeout(r, 1000));
let reviews = null;
let errorText = null;
for (let i = 0; i < 150; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  reviews = await worker
    .evaluate(
      (key) =>
        chrome.storage.local.get(key).then((d) => {
          const arr = d[key];
          if (!Array.isArray(arr) || arr.length === 0) return null;
          const r = arr[0]?.reviews;
          return Array.isArray(r) && r.length > 0 ? r : null;
        }),
      HISTORY_KEY
    )
    .catch(() => null);
  if (reviews) break;
  errorText = await popupTab
    .evaluate(() => {
      const err = document.getElementById("error-text");
      return err && !err.closest(".hidden") ? err.textContent : null;
    })
    .catch(() => null);
  if (errorText) break;
}

if (reviews) {
  const withImages = reviews.filter((r) => (r.imageUrls?.length ?? 0) > 0);
  console.log(`수집 완료: ${reviews.length}개 (이미지 ${withImages.length}개)`);
} else {
  console.error("수집 실패 — popup 오류:", errorText ?? "(오류 메시지 없음)");
  process.exit(8);
}

// ④ popup 탭의 실제 다운로드 버튼 클릭
await popupTab.bringToFront().catch(() => {});
await new Promise((r) => setTimeout(r, 1500));

const dlXlsx = popupTab.locator("#dl-xlsx");
const dlCsv = popupTab.locator("#dl-csv");
console.log("dl-xlsx visible:", await dlXlsx.isVisible().catch(() => false));
console.log("dl-csv visible:", await dlCsv.isVisible().catch(() => false));

const [xlsxDownload] = await Promise.all([
  popupTab.waitForEvent("download", { timeout: 30000 }),
  dlXlsx.click({ timeout: 10000 })
]);
await xlsxDownload.saveAs(`${OUT_DIR}/reviews.xlsx`);
console.log("xlsx 다운로드:", `${OUT_DIR}/reviews.xlsx`);

const [csvDownload] = await Promise.all([
  popupTab.waitForEvent("download", { timeout: 30000 }),
  dlCsv.click({ timeout: 10000 })
]);
await csvDownload.saveAs(`${OUT_DIR}/reviews.csv`);
console.log("csv 다운로드:", `${OUT_DIR}/reviews.csv`);

// ⑤ 파일 검증
const csv = readFileSync(`${OUT_DIR}/reviews.csv`, "utf8");
const csvHeader = csv.split("\r\n")[0];
console.log("CSV 헤더:", csvHeader.slice(0, 120), "...");
console.log("CSV 열 수:", csvHeader.split(",").length);
console.log(
  "CSV 에 이미지 URL 포함:",
  csv.includes("thumbnail.coupangcdn.com") || csv.includes("static.coupangcdn.com")
);
writeFileSync(`${OUT_DIR}/reviews.json`, JSON.stringify(reviews, null, 2));

await browser.close().catch(() => {});
if (!KEEP_CHROME && chrome) {
  try {
    process.kill(chrome.pid, "SIGTERM");
  } catch {
    /* already gone */
  }
}
console.log("done ->", OUT_DIR);
