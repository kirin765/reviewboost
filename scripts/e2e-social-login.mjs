#!/usr/bin/env node
/**
 * 소셜 로그인 E2E — 프로덕션(reviewboost.co.kr) 대상 실측
 *
 * 흐름: /api/auth/social/<provider>/start?next=/extension-connect
 *   → 네이버/카카오 인가 (CDP Chrome 9222의 로그인 세션 이용, 미로그인/캡차면
 *     콘솔 안내 후 최대 5분 대기 — 브라우저에서 직접 완료)
 *   → 콜백(코드 교환 → Clerk 사용자 조회/생성 → sign-in token)
 *   → /login?__clerk_ticket=... 위젯 자동 교환 → __session 쿠키
 *   → /extension-connect 최종 리다이렉트
 *
 * 검증: ① 최종 URL, ② __session 쿠키 존재(CDP), ③ /api/extension/usage 가
 *       authenticated:true + 유료/무료 tier 반환
 *
 * 사용법: node scripts/e2e-social-login.mjs [naver|kakao]
 * 사전 조건: 사용자 Chrome --remote-debugging-port=9222 (네이버 세션 보유)
 */
import { chromium } from "playwright";

const PORT = 9222;
const PROD = "https://reviewboost.co.kr";
const RUN_SECONDS = 300; // 최대 5분 (수동 완료 여유)
const provider = (process.argv[2] ?? "naver").toLowerCase();
if (!["naver", "kakao"].includes(provider)) {
  console.error(`알 수 없는 provider: ${provider} (naver|kakao)`);
  process.exit(2);
}
const OUT = provider === "naver" ? "docs/naver-login" : "docs/kakao-login";
// 로그인(수동)/동의 화면 호스트 — 카카오는 로그인(accounts)과 인가(kauth)가 분리
const LOGIN_HOSTS = provider === "naver" ? ["nid.naver.com"] : ["kauth.kakao.com", "accounts.kakao.com"];

const t = () => new Date().toTimeString().slice(0, 8);
const log = (...a) => console.log(`[${t()}]`, ...a);

// CDP 연결 (최대 60s)
let browser = null;
for (let i = 0; i < 60 && !browser; i++) {
  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${PORT}`);
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}
if (!browser) {
  console.error("Chrome CDP(9222) 연결 실패 — 사용자 Chrome을 --remote-debugging-port=9222 로 띄우세요.");
  process.exit(2);
}
log("CDP 연결됨");

const ctx = browser.contexts()[0] ?? (await browser.newContext());
const page = await ctx.newPage();
const cdp = await page.context().newCDPSession(page);
page.setDefaultTimeout(15000);

const cdpCookies = async () => {
  const { cookies } = await cdp.send("Network.getCookies", { urls: [PROD + "/", "https://clerk.reviewboost.co.kr/"] });
  return cookies;
};

// 0) 사전 상태 — 게스트 확인
await page.goto(`${PROD}/extension-connect`, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);
const preCookies = await cdpCookies();
const preHadSession = preCookies.some((c) => c.name === "__session");
log("사전 상태: 게스트 페이지 로드, __session:", preHadSession ? "기존 있음" : "없음");

// 1) start
log(`${provider} start 이동...`);
await page.goto(`${PROD}/api/auth/social/${provider}/start?next=${encodeURIComponent("/extension-connect")}`, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
});
await page.waitForTimeout(3000);
log("start 후 URL:", page.url().slice(0, 140));

// 2) 플로우 폴링
const deadline = Date.now() + RUN_SECONDS * 1000;
let consentClicked = false;
let manualNoticeShown = false;
let ticketSeen = false;
let kakaoBlocked = false;
let finalUrl = page.url();
let bodyAtEnd = "";

while (Date.now() < deadline) {
  let url;
  try {
    url = page.url();
  } catch {
    // 탭/페이지가 닫힌 경우 — 재오픈 시도 1회
    log("페이지가 닫힘 — 재오픈 시도");
    const url = `${PROD}/api/auth/social/${provider}/start?next=${encodeURIComponent("/extension-connect")}`;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
    } catch {
      log("재오픈 실패 — 중단");
      break;
    }
    await page.waitForTimeout(1500);
    url = page.url();
  }

  if (url.startsWith(PROD) && !url.includes("/api/auth") && !url.includes("/login")) {
    finalUrl = url;
    break;
  }
  if (url.startsWith(PROD) && url.includes("/login") && url.includes("error=")) {
    finalUrl = url;
    log("에러 리다이렉트 감지:", url.slice(0, 160));
    break;
  }
  if (url.includes("/login") && url.includes("__clerk_ticket")) {
    ticketSeen = true;
    if (!manualNoticeShown) log("ticket 페이지 도달 — 위젯 세션 교환 대기...");
  }

  // 동의 화면 자동 클릭 (네이버/카카오)
  const consentBtn =
    provider === "naver"
      ? page.locator("button:has-text('OK'), button:has-text('동의'), button:has-text('Agree'), button:has-text('확인')").first()
      : page.locator("button:has-text('동의하고 계속하기'), button:has-text('동의하기'), button:has-text('동의')").first();
  if (
    !url.includes("/login") &&
    ((provider === "naver" && url.includes("nid.naver.com") && url.includes("oauth2.0/authorize")) ||
      (provider === "kakao" && url.includes("kauth.kakao.com") && url.includes("oauth/authorize")))
  ) {
    if (!consentClicked) {
      await page.waitForTimeout(2000);
      try {
        await consentBtn.click({ timeout: 6000, force: true });
        consentClicked = true;
        log("동의 버튼 자동 클릭됨");
      } catch {
        log("동의 화면이지만 버튼 자동 클릭 실패 — 브라우저에서 직접 클릭해 주세요");
        manualNoticeShown = true;
      }
    }
  }

  // 카카오/네이버 로그인 폼 or 캡차 — 수동 안내
  if (LOGIN_HOSTS.some((h) => url.includes(h)) && !manualNoticeShown) {
    const txt = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 200);
    if (/\/login|captcha|자동입력|보안|로그인/.test(url + " " + txt)) {
      log(`[수동 필요] ${provider} 로그인/캡차 화면 — 브라우저에서 직접 진행해 주세요 (최대 ${RUN_SECONDS}s 대기).`);
      log("  현재 화면:", txt.slice(0, 120));
      manualNoticeShown = true;
    }
  }

  // 카카오 서비스 차단 (검수/설정 미완료 KOE006) — 즉시 종료
  if (provider === "kakao" && url.includes("kauth.kakao.com")) {
    const txt = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
    if (/KOE\d{3}|settings issue|prevent|관리자|service settings/.test(txt)) {
      log("카카오 서비스 차단 감지 (KOE):", txt.slice(0, 260));
      kakaoBlocked = true;
      break;
    }
  }

  await page.waitForTimeout(1000);
}

// 3) 최종 상태 수집
let cookies = [], session = [], usage = null;
try {
  finalUrl = page.url();
  await page.waitForTimeout(4000);
  bodyAtEnd = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ").slice(0, 300);
  cookies = await cdpCookies();
  session = cookies.filter((c) => c.name === "__session");
} catch {
  log("페이지 종료됨 — 쿠키/본문 수집 생략");
}

// 4) 서버 인증 확인 — /api/extension/usage
try {
  const res = await page.evaluate(async () => {
    const r = await fetch("/api/extension/usage", { cache: "no-store" });
    return r.json();
  });
  usage = res;
} catch (e) {
  usage = { fetchError: String(e).slice(0, 120) };
}
log("usage API:", JSON.stringify(usage));

// 5) 스크린샷
await page.screenshot({ path: `${OUT}/e2e-${provider}-final.png`, timeout: 15000 }).catch(() => {});

// 6) 판정
const ok =
  finalUrl.startsWith(PROD) &&
  !finalUrl.includes("/api/auth") &&
  !finalUrl.includes("/login?error") &&
  session.length > 0 &&
  usage?.authenticated === true;

console.log("\n=== 결과 ===");
console.log("provider      :", provider);
console.log("최종 URL      :", finalUrl.slice(0, 160));
console.log("ticket 경유   :", ticketSeen ? "yes" : "no");
console.log("동의 자동 클릭:", consentClicked ? "yes" : "no");
console.log("카카오 차단   :", kakaoBlocked ? "KOE 감지" : "no");
console.log("__session     :", session.length ? `있음 (${session.length}개)` : "없음");
console.log("usage API     :", JSON.stringify(usage));
console.log("최종 화면     :", bodyAtEnd.slice(0, 200));
console.log("판정          :", ok ? "PASS ✅" : "FAIL ❌");

await page.close().catch(() => {});
await browser.close().catch(() => {});
process.exit(ok ? 0 : 1);