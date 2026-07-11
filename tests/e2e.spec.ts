import { test, expect } from "@playwright/test";

test.describe("ReviewBoost E2E Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/AI 리뷰 분석 툴/);
  });

  test("login page loads", async ({ page }) => {
    // Auth pages now render the Clerk <SignIn/> widget, which only mounts when
    // Clerk is configured. In the local (no-Clerk) run the widget can't mount,
    // so we assert the route resolves and renders its SEO title.
    await page.goto("/login");
    await expect(page).toHaveTitle(/로그인/);
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveTitle(/회원가입/);
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "운영 빈도와 저장 필요도에 맞는 플랜", exact: true })).toBeVisible();
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
        !e.includes("googletagmanager")
    );
    expect(criticalErrors).toHaveLength(0);
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
