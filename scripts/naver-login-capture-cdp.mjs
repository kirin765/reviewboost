#!/usr/bin/env node
/**
 * 네이버 로그인 심사용 단계별 화면 캡처 헬퍼 (CDP — 사용자 실제 Chrome)
 *
 * 저장소의 기존 패턴(extension/scripts/e2e-extension.mjs)과 동일하게
 * 사용자의 실제 Chrome(/Users/kiwankim/chrome-cdp-profile, 포트 9222)을 띄워
 * 네이버 봇 감지(캡차)가 새 세션마다 다시 걸리는 것을 피하고,
 * 사용자가 실제 Chrome 창에서 보안 확인(캡차)을 직접 해결한다.
 *
 * 실행:
 *   NAVER_TEST_ID=kwan765 NAVER_TEST_PW='...' node scripts/naver-login-capture-cdp.mjs
 *
 * 출력 (docs/naver-login/):
 *   01-signup-page.png      회원가입 페이지(네이버 버튼)
 *   02-naver-login-screen.png  네이버 공식 로그인 화면
 *   03-consent-screen.png   네이버 동의 화면
 *   04-login-complete.png   ReviewBoost 로그인 완료 화면
 */
import { execSync, spawn } from "node:child_process";
import { connect as netConnect } from "node:net";
import { chromium } from "playwright";

const OUT = "docs/naver-login";
const LOCAL = "http://localhost:3001";
const PROD = "https://reviewboost.co.kr";
const PORT = 9222;
const PROFILE = "/Users/kiwankim/chrome-cdp-profile";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ID = process.env.NAVER_TEST_ID ?? "kwan765";
const PW = process.env.NAVER_TEST_PW ?? "";
const shot = (p) => ({ path: `${OUT}/${p}`, timeout: 15000 });

if (!PW) {
  console.error("NAVER_TEST_PW 가 없습니다. 비밀번호를 환경변수로 전달해 주세요.");
  process.exit(1);
}

// 1) Chrome(9222) 띄우기 — 이미 떠 있으면 재사용
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

// 프로덕션 콜백(미배포, 404)을 로컬 dev 서버로 가로채 로그인 완료까지 동작하게 함
await page.route(`${PROD}/api/auth/social/naver/callback*`, async (route) => {
  const u = new URL(route.request().url());
  u.protocol = "http:";
  u.host = "localhost:3001";
  try {
    const resp = await route.fetch({ url: u.toString(), redirect: "manual" });
    console.log("[intercept] callback ->", resp.status(), u.toString().slice(0, 90));
    await route.fulfill({ response: resp });
  } catch (e) {
    console.log("[intercept] failed:", e.message.slice(0, 80));
    await route.abort();
  }
});

const bodyText = async () => (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");

console.log("1/4 회원가입 페이지 캡처 중...");
await page.goto(`${LOCAL}/signup`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(3000);
await page.screenshot(shot("01-signup-page.png"));
console.log("  -> 01-signup-page.png 저장");

console.log("2/4 네이버 로그인 화면으로 이동...");
await page.goto(`${LOCAL}/api/auth/social/naver/start`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(4000);
await page.screenshot(shot("02-naver-login-screen.png"));
console.log("  -> 02-naver-login-screen.png 저장");

// 아이디/비밀번호 자동 입력 + 제출 (이미 로그인된 세션이면 동의 화면으로 직행)
const idField = page.locator("#id");
try {
  await idField.waitFor({ timeout: 8000 });
  await idField.fill(ID);
  await page.locator("#pw").fill(PW);
  const ipSec = page.locator("#keep_secure");
  if ((await ipSec.count()) && (await ipSec.isChecked())) {
    await ipSec.uncheck().catch(() => {});
    console.log("  (IP 보안 해제)");
  }
  console.log("  아이디/비밀번호 입력 완료, 로그인 제출 중...");
  await page
    .locator("button[type=submit], .btn_login, input[type=submit]")
    .first()
    .click({ timeout: 15000 })
    .catch(() => page.keyboard.press("Enter"));
  await page.waitForTimeout(6000);
  console.log("  제출 후 URL:", page.url().slice(0, 110));
  console.log("  화면:", (await bodyText()).slice(0, 200));
} catch {
  console.log("  (로그인 폼 없음 — 기존 로그인 세션으로 동의 화면 직행)");
  console.log("  URL:", page.url().slice(0, 130));
}

// 보안 확인(캡차) 또는 동의 화면 대기 — 최대 5분
console.log("\n==================================================================");
console.log("  실제 Chrome 창(9222)에서 네이버 보안 확인(캡차)을 직접 해결해 주세요.");
console.log("  (로그인은 자동 입력됨 — 캡차만 풀면 됩니다)");
console.log("  동의 화면이 뜨면 자동 캡처합니다. (최대 5분 대기)");
console.log("==================================================================\n");

let consentShot = false;
const deadline = Date.now() + 300_000;
while (Date.now() < deadline) {
  const url = page.url();
  if (!consentShot && url.includes("nid.naver.com") && url.includes("oauth2.0/authorize")) {
    await page.waitForTimeout(2500);
    await page.screenshot(shot("03-consent-screen.png"));
    consentShot = true;
    console.log("3/4 -> 03-consent-screen.png 저장 (동의 화면)");
  }
  if (url.startsWith(`${LOCAL}`) && !url.includes("/api/auth")) {
    break;
  }
  await page.waitForTimeout(1000);
}

if (!consentShot) {
  console.log("동의 화면을 감지하지 못했습니다. 현재 URL:", page.url().slice(0, 140));
  console.log("현재 화면:", (await bodyText()).slice(0, 300));
  process.exit(1);
}

// 동의 버튼 클릭 (OK / 동의 / Agree) — 체크박스는 커스텀 div(custom_checkbox)라 force 클릭 사용
const okBtn = page.locator("button:has-text('OK'), button:has-text('동의'), button:has-text('Agree')").first();
try {
  await okBtn.click({ timeout: 8000, force: true });
  console.log("  동의(OK) 클릭됨");
} catch {
  console.log("  동의 버튼 클릭 실패 — 사용자가 직접 클릭해 주세요");
}
await page.waitForTimeout(6000);

await page.waitForTimeout(3000);
await page.screenshot(shot("04-login-complete.png"));
console.log("4/4 -> 04-login-complete.png 저장");
console.log("완료 URL:", page.url().slice(0, 140));

console.log("\n캡처 완료. docs/naver-login/ 폴더를 확인하세요.");
