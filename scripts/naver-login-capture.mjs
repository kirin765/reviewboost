#!/usr/bin/env node
/**
 * 네이버 로그인 심사용 단계별 화면 캡처 (프로덕션 + CDP)
 *
 * 프로덕션(reviewboost.co.kr)에 소셜 로그인이 배포되어 있으므로 실제 서비스 흐름을 그대로 캡처한다.
 * - 02(네이버 로그인 폼): 별도 fresh 브라우저로 authorize 페이지를 열어 로그인 폼을 캡처 (로그인 안 하므로 캡차 없음)
 * - 01/03/04: 사용자 실제 Chrome(9222, 로그인 세션 보유)로 프로덕션 흐름을 타서 캡차 없이 동의→완료 진행
 *
 * 출력 (docs/naver-login/):
 *   01-signup-page.png       프로덕션 회원가입 페이지(네이버 버튼)
 *   02-naver-login-screen.png 네이버 공식 로그인 화면
 *   03-consent-screen.png    네이버 동의 화면
 *   04-login-complete.png    로그인 완료 화면
 */
import { execSync, spawn } from "node:child_process";
import { connect as netConnect } from "node:net";
import { chromium } from "playwright";

const OUT = "docs/naver-login";
const PROD = "https://reviewboost.co.kr";
const PORT = 9222;
const PROFILE = "/Users/kiwankim/chrome-cdp-profile";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const shot = (p) => ({ path: `${OUT}/${p}`, timeout: 15000 });

// ---------- Phase A: 02 — 네이버 로그인 폼 (fresh 브라우저, 로그인 안 함) ----------
const fresh = await chromium.launch({ headless: true });
const fp = await (await fresh.newContext()).newPage();
await fp.goto(`${PROD}/api/auth/social/naver/start`, { waitUntil: "domcontentloaded", timeout: 60000 });
await fp.waitForTimeout(4000);
console.log("02 URL:", fp.url().slice(0, 120));
await fp.screenshot(shot("02-naver-login-screen.png"));
console.log("-> 02-naver-login-screen.png 저장 (네이버 로그인 폼)");
await fresh.close();

// ---------- Phase B: 01/03/04 — 사용자 Chrome(CDP)로 프로덕션 흐름 ----------
const portOpen = await new Promise((r) => {
  const s = netConnect(PORT, "127.0.0.1");
  s.once("connect", () => { s.destroy(); r(true); });
  s.once("error", () => r(false));
});
if (!portOpen) {
  try { execSync(`pkill -f "chrome-cdp-profile" || true`); } catch {}
  await new Promise((r) => setTimeout(r, 1500));
  spawn(CHROME, [
    `--user-data-dir=${PROFILE}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    `--remote-debugging-port=${PORT}`,
    "about:blank"
  ], { stdio: "ignore", detached: true });
  console.log("Chrome 시작됨 (포트 9222)");
}

let browser = null;
for (let i = 0; i < 40 && !browser; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  try { browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`); } catch {}
}
if (!browser) {
  console.error("Chrome CDP 연결 실패");
  process.exit(2);
}
console.log("CDP 연결됨");

const ctx = browser.contexts()[0] ?? (await browser.newContext());
const page = await ctx.newPage();

// 01 — 프로덕션 회원가입 페이지
await page.goto(`${PROD}/signup`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
await page.screenshot(shot("01-signup-page.png"));
console.log("-> 01-signup-page.png 저장 (프로덕션 회원가입)");

// 프로덕션 start → 네이버 authorize (CDP 세션 있음 → 동의 화면 직행)
await page.goto(`${PROD}/api/auth/social/naver/start`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(5000);
console.log("start 후 URL:", page.url().slice(0, 150));

// 동의 화면 캡처 (authorize + 동의 버튼)
let consentShot = false;
const deadline = Date.now() + 120_000;
while (Date.now() < deadline) {
  const url = page.url();
  if (!consentShot && url.includes("nid.naver.com") && url.includes("oauth2.0/authorize")) {
    await page.waitForTimeout(2000);
    await page.screenshot(shot("03-consent-screen.png"));
    consentShot = true;
    console.log("-> 03-consent-screen.png 저장 (동의 화면)");
  }
  if (url.startsWith(`${PROD}`) && !url.includes("/api/auth")) {
    break;
  }
  await page.waitForTimeout(1000);
}

if (!consentShot) {
  console.log("동의 화면 감지 실패. URL:", page.url().slice(0, 140));
  console.log("화면:", (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300));
  process.exit(1);
}

// 동의(OK) 클릭
const okBtn = page.locator("button:has-text('OK'), button:has-text('동의'), button:has-text('Agree')").first();
try {
  await okBtn.click({ timeout: 8000, force: true });
  console.log("  동의(OK) 클릭됨");
} catch {
  console.log("  동의 버튼 자동 클릭 실패 — 브라우저에서 직접 클릭해 주세요");
}
await page.waitForTimeout(8000);

// 완료 화면 캡처
await page.screenshot(shot("04-login-complete.png"));
console.log("-> 04-login-complete.png 저장");
console.log("완료 URL:", page.url().slice(0, 160));
console.log("완료 화면:", (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200));

console.log("\n캡처 완료. docs/naver-login/ 폴더를 확인하세요.");
