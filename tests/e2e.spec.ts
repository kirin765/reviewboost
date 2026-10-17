import { test, expect, type Page } from "@playwright/test";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";

const E2E_EMAIL = process.env.E2E_CLERK_USER_EMAIL;

// Signs in the dedicated Clerk test user via a backend-issued ticket (no password
// needed). Requires E2E_CLERK_USER_EMAIL + Clerk keys in the environment.
async function signInTestUser(page: Page) {
  await setupClerkTestingToken({ page });
  await page.goto("/");
  // Wait for Clerk to finish loading before signing in — the first navigation
  // after a cold dev compile can otherwise race window.Clerk.
  await clerk.loaded({ page });
  try {
    await clerk.signIn({ page, emailAddress: E2E_EMAIL! });
  } catch (err) {
    // 티켓 로그인 성공 직후 clerk-js가 인증 완료 SPA 리다이렉트를 수행해
    // page.evaluate 컨텍스트가 파괴되는 것은 정상 (실측: sign_ins 200 complete
    // + sessions/touch 후 리다이렉트) — 세션은 이미 발급됨. 무시하고 재로드.
    console.warn(`[e2e] signIn navigation tolerated: ${String(err).slice(0, 120)}`);
  }
  await clerk.loaded({ page });
}

test.describe("ReviewBoost E2E — public pages", () => {
  for (const authenticated of [false, true]) {
    test(`checkout explains billing before an explicit click (${authenticated ? "signed in" : "guest"})`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.route("**/api/extension/usage", route => route.fulfill({
        json: { authenticated, tier: authenticated ? "free" : "anonymous", day: "2026-10-14", limit: 50, used: 0, remaining: 50 }
      }));
      await page.route("**/api/billing/claim", route => route.fulfill({ json: { claimed: 0 } }));
      let checkoutRequests = 0;
      await page.route("**/api/billing/checkout", route => {
        checkoutRequests += 1;
        return route.fulfill({ status: 503, json: { error: "테스트 결제 요청 확인" } });
      });
      await page.goto("/extension-connect?checkout=1");
      await expect(page.getByText("오늘 4,900원 결제 · 부가세 포함")).toBeVisible();
      await expect(page.getByText(/결제창의 미래 날짜는/)).toBeVisible();
      await expect(page.getByRole("link", { name: "구독 관리 / 해지 — Paddle 고객지원" })).toHaveAttribute("href", "https://paddle.net/contact");
      expect(checkoutRequests).toBe(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: `/tmp/reviewboost-checkout-${authenticated ? "member" : "guest"}.png`, fullPage: true });
      await page.getByRole("button", { name: "월 4,900원 구독하기" }).click();
      await expect(page.getByText("테스트 결제 요청 확인")).toBeVisible();
      expect(checkoutRequests).toBe(1);
    });
  }

  test("optional survey appears after paid extension connection and can be skipped", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(() => {
      window.addEventListener("message", event => {
        if (event.data?.source === "rb-extension-page") {
          window.postMessage({ source: "rb-extension", requestId: event.data.requestId, ok: true }, window.location.origin);
        }
      });
    });
    await page.route("**/api/extension/usage", route => route.fulfill({
      json: { authenticated: true, tier: "paid", day: "2026-10-07", limit: null, used: null, remaining: null }
    }));
    await page.route("**/api/extension/token", route => route.fulfill({ json: { token: "test-only", expiresAt: 9999999999 } }));
    let surveyRequests = 0;
    await page.route("**/api/extension/survey", route => {
      surveyRequests += 1;
      return route.fulfill({ json: { ok: true } });
    });
    await page.goto("/extension-connect?ext=test-extension");
    await expect(page.getByText(/익스텐션이 연결되었습니다/)).toBeVisible();
    await expect(page.getByLabel("주로 하려는 작업")).toBeVisible();
    await expect(page.getByRole("button", { name: "답변 보내기" })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: "/tmp/reviewboost-survey-mobile.png", fullPage: true });
    await page.getByRole("button", { name: "건너뛰기" }).click();
    expect(surveyRequests).toBe(0);
    await page.reload();
    await expect(page.getByText(/익스텐션이 연결되었습니다/)).toBeVisible();
    await expect(page.getByLabel("주로 하려는 작업")).toHaveCount(0);
  });

  test("paid guest return offers account connection instead of a second checkout", async ({ page }) => {
    await page.route("**/api/extension/usage", (route) => route.fulfill({
      json: { authenticated: false, tier: "anonymous", day: "2026-10-06", limit: 50, used: 0, remaining: 50 }
    }));
    await page.goto("/extension-connect?billing=success&checkout=1");
    await expect(page.getByRole("link", { name: "로그인하고 연결하기" })).toBeVisible();
    await expect(page.getByRole("status")).toContainText("다시 결제할 필요는 없습니다");
    await expect(page.getByRole("button", { name: /결제하기|구독하기/ })).toHaveCount(0);
    await expect(page).toHaveURL(/payment_return=1/);
    await expect(page.getByRole("link", { name: "로그인하고 연결하기" })).toHaveAttribute("href", /payment_return%3D1/);
    await page.reload();
    await expect(page.getByRole("status")).toContainText("다시 결제할 필요는 없습니다");
    await expect(page.getByRole("button", { name: /결제하기|구독하기/ })).toHaveCount(0);
  });

  test("delayed paid subscription is recovered without reopening checkout", async ({ page }) => {
    let claimed = false;
    let claims = 0;
    let checkoutRequests = 0;
    page.on("request", request => { if (request.url().includes("/api/billing/checkout")) checkoutRequests += 1; });
    await page.route("**/api/extension/usage", (route) => route.fulfill({
      json: { authenticated: true, tier: claimed ? "paid" : "free", day: "2026-10-06", limit: claimed ? null : 50, used: claimed ? null : 50, remaining: claimed ? null : 0 }
    }));
    await page.route("**/api/billing/claim", (route) => {
      claims += 1;
      claimed = claims >= 2;
      return route.fulfill({ json: { claimed: claimed ? 1 : 0 } });
    });
    await page.goto("/extension-connect?billing=success&checkout=1");
    await expect(page.getByText("익스텐션 유료 (무제한)", { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("status")).toContainText("유료 구독이 확인되었습니다");
    expect(checkoutRequests).toBe(0);
  });

  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/쇼핑몰 리뷰 수집기/);
  });

  test("login page renders the Clerk sign-in widget", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/login");
    await expect(page).toHaveTitle(/로그인/);
    await expect(page.locator(".cl-rootBox").first()).toBeVisible();
  });

  test("signup page renders the Clerk sign-up widget", async ({ page }) => {
    await setupClerkTestingToken({ page });
    await page.goto("/signup");
    await expect(page).toHaveTitle(/회원가입/);
    await expect(page.locator(".cl-rootBox").first()).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "무료로 시작하고, 필요한 만큼 수집하세요", exact: true })).toBeVisible();
  });

  test("homepage has no critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("manifest") &&
        !e.includes("webpack-hmr") &&
        !e.includes("ERR_INVALID_HTTP_RESPONSE") &&
        // Third-party analytics/billing scripts are CSP-blocked in local dev.
        !e.includes("cdn.paddle.com") &&
        !e.includes("paddle.css") &&
        !e.includes("profitwell") &&
        !e.includes("googletagmanager") &&
        !e.includes("clerk.")
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("ReviewBoost E2E — authenticated dashboard", () => {
  test.skip(!E2E_EMAIL, "E2E_CLERK_USER_EMAIL not set — skipping authenticated flows");

  test.beforeEach(async ({ page }) => {
    await signInTestUser(page);
  });

  test("authenticated user reaches the protected dashboard (no redirect)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "홈", level: 1 })).toBeVisible();
  });

  test("dashboard shell navigation is operable (desktop)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "홈", level: 1 })).toBeVisible();

    // Navigate to the AI 분석 workspace via the sidebar.
    await page.getByRole("link", { name: "AI분석" }).first().click();
    await expect(page).toHaveURL(/\/dashboard\/analyze$/);
    await expect(page.getByRole("heading", { name: "AI분석", level: 1 })).toBeVisible();

    // Navigate back to the dashboard home via the sidebar.
    await page.getByRole("link", { name: "홈" }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole("heading", { name: "홈", level: 1 })).toBeVisible();

    // Brand link in the sidebar returns to the main marketing site.
    const homeBackLink = page.getByRole("link", { name: /리뷰 분석 작업면/ });
    await expect(homeBackLink).toBeVisible();
    await homeBackLink.click();
    await expect(page).toHaveURL("/");
  });

  test("dashboard mobile drawer and backdrop are operable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/dashboard");

    const openToggle = page.getByRole("button", { name: "메뉴 열기" });
    await expect(openToggle).toBeVisible();
    await openToggle.click();

    const closeToggle = page.getByRole("button", { name: "메뉴 닫기" });
    await expect(closeToggle).toBeVisible();

    const drawer = page.locator("#workspace-navigation");
    await expect(drawer).toBeVisible();

    const backdrop = page.locator("div.fixed.inset-0.z-30");
    await expect(backdrop).toBeVisible();

    // Clicking the backdrop (away from the drawer) closes the drawer.
    await backdrop.click({ position: { x: 350, y: 500 } });
    await expect(openToggle).toBeVisible();
    await expect(drawer).toBeHidden();
  });

  test("dashboard mapping panel stays within card bounds on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard/analyze");
    await expect(page.getByRole("heading", { name: "CSV 업로드", exact: true })).toBeVisible();

    await page.setInputFiles("#dashboardCsvInput", {
      name: "sample-long-headers.csv",
      mimeType: "text/csv",
      buffer: Buffer.from([
        "review_id,product_name,review_text,reviewer_comment_text_very_long_header_name,rating,review_date,device_type,source_channel",
        "1,펜촉 4XL,좋아요,좋았어요 매우 좋았어요 매우 좋았어요,5,2026-01-01,mobile,web",
        "2,키보드 Pro,재구매의사 있어요,배송이 빨라요 매우 만족해요,4,2026-01-02,desktop,store",
        "3,마우스,개선이 필요해요,버튼이 너무 작아요,2,2026-01-03,mobile,partner",
        "4,노트북,훌륭해요,완전 만족,5,2026-01-04,web,partner",
        "5,헤드셋,별로,소리 품질이 아쉬워요,2,2026-01-05,store,web"
      ].join("\n"))
    });

    await page.getByRole("button", { name: "다음: 열 확인" }).click();

    const mappingPanelCard = page.getByRole("heading", { name: "열 매핑 패널" }).locator("..");
    await expect(mappingPanelCard).toBeVisible();

    const widths = await mappingPanelCard.evaluate((el) => {
      return {
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth
      };
    });
    expect(widths.scrollWidth).toBeLessThanOrEqual(widths.clientWidth + 2);
  });
});
