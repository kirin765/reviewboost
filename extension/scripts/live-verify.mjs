/**
 * 실 URL 검증 도구: 진짜 Chrome 으로 상품 페이지를 열어 리뷰 API 를 직접 호출하고
 * (익스텐션 collectCoupang 과 동일한 요청), 익스텐션의 실제 lib 코드로
 * 정규화 → 공식 스마트스토어 25열 CSV/XLSX 내보내기를 생성해 검증한다.
 *
 * 사용법: LIVE_URL="https://www.coupang.com/vp/products/123" node scripts/live-verify.mjs
 * 산출물: /tmp/live-raw-reviews.json, /tmp/live-normalized.json, /tmp/live-out.csv, /tmp/live-out.xlsx
 *
 * 참고: 스마트스토어는 클린 프로필에서 로그인 벽(네이버 세션 필요)이라 쿠팡으로 테스트한다.
 */
import { spawn } from "node:child_process";
import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 9223;
const LIVE_URL =
  process.env.LIVE_URL ??
  "https://www.coupang.com/vp/products/9523158816?vendorItemId=95342824639";

const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    `--user-data-dir=/tmp/rb-live-${process.pid}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    `--remote-debugging-port=${PORT}`,
    "about:blank"
  ],
  { stdio: "ignore", detached: true }
);

let browser = null;
for (let i = 0; i < 30 && !browser; i++) {
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
const page = await ctx.newPage();
let ok = false;
for (let i = 0; i < 3 && !ok; i++) {
  await page.goto(LIVE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);
  ok = await page
    .evaluate(() => location.href.includes("coupang.com") && !document.body.innerText.includes("자동화된"))
    .catch(() => false);
}
console.log("page ok:", ok, "->", page.url());
if (!ok) process.exit(3);

// 익스텐션 collectCoupang 과 동일한 API 호출 (MAIN world, same-origin + 쿠키)
const result = await page.evaluate(async () => {
  const productId = location.href.match(/(?:vp\/)?products\/(\d+)/)?.[1];
  if (!productId) return { error: "no product id", items: [] };
  const items = [];
  for (let p = 1; p <= 5; p++) {
    const url =
      `/next-api/review?productId=${encodeURIComponent(productId)}&page=${p}&size=10` +
      `&sortBy=ORDER_SCORE_ASC&ratingSummary=false&ratings=&market=`;
    const res = await fetch(url, { headers: { accept: "application/json" }, credentials: "include" });
    if (!res.ok) return { error: `http ${res.status}`, items };
    const json = await res.json().catch(() => null);
    const contents = json?.rData?.paging?.contents ?? [];
    items.push(...contents);
    if (p >= Number(json?.rData?.paging?.totalPage ?? 1) || contents.length === 0) break;
    await new Promise((r) => setTimeout(r, 600));
  }
  return { error: null, items, productId };
});
console.log("raw:", result.error ?? `items=${result.items.length}`);
if (result.error || !result.items.length) process.exit(4);
writeFileSync("/tmp/live-raw-reviews.json", JSON.stringify(result.items, null, 2));

await browser.close().catch(() => {});
try {
  process.kill(chrome.pid, "SIGTERM");
} catch {
  /* already gone */
}

// 익스텐션 실제 lib 로 정규화 + 공식 폼 내보내기
const entry = "/tmp/live-pipeline-entry.mts";
const productId = JSON.stringify(result.productId ?? "");
writeFileSync(
  entry,
  `
import { readFileSync, writeFileSync } from "node:fs";
import { normalizeCoupangReview, cleanReviews } from "${root}/src/lib/normalize";
import { reviewsToCsv } from "${root}/src/lib/csv";
import { reviewsToXlsx } from "${root}/src/lib/xlsx";

const raws = JSON.parse(readFileSync("/tmp/live-raw-reviews.json", "utf8"));
const reviews = cleanReviews(raws.map((r) => normalizeCoupangReview(r)));
const withImages = reviews.filter((r) => (r.imageUrls?.length ?? 0) > 0);
console.log("normalized:", reviews.length, "| with imageUrls:", withImages.length);
for (const r of withImages.slice(0, 3)) {
  console.log("-", String(r.text ?? "").slice(0, 30), "| images:", r.imageUrls.length, "|", r.imageUrls[0]);
}
const ctx = { productNo: ${productId}, productTitle: "live-verify" };
writeFileSync("/tmp/live-out.csv", reviewsToCsv(reviews, ctx));
writeFileSync("/tmp/live-out.xlsx", Buffer.from(reviewsToXlsx(reviews, ctx)));
writeFileSync("/tmp/live-normalized.json", JSON.stringify(reviews, null, 2));
console.log("wrote /tmp/live-out.csv, /tmp/live-out.xlsx, /tmp/live-normalized.json");
`
);
await build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "/tmp/live-pipeline-entry.mjs",
  logLevel: "error"
});
const { execFileSync } = await import("node:child_process");
execFileSync("node", ["/tmp/live-pipeline-entry.mjs"], { stdio: "inherit" });
console.log("done");
