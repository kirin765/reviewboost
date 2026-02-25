import { test, expect } from "@playwright/test";

test.describe("ReviewBoost E2E Tests", () => {
  test("homepage loads successfully", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/ReviewBoost/i);
  });

  test("login page loads", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "로그인", exact: true })).toBeVisible();
  });

  test("signup page loads", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByRole("heading", { name: "회원가입", exact: true })).toBeVisible();
  });

  test("pricing page loads", async ({ page }) => {
    await page.goto("/pricing");
    await expect(page.getByRole("heading", { name: "요금제 (MVP)", exact: true })).toBeVisible();
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
        !e.includes("ERR_INVALID_HTTP_RESPONSE")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("dashboard shell tabs are operable (desktop)", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "리뷰 CSV 분석" })).toBeVisible();

    const resultsTab = page.getByRole("tab", { name: "결과 보기" });
    await resultsTab.click();
    await expect(resultsTab).toHaveAttribute("aria-selected", "true");
    const goToAnalysisBtn = page.getByRole("button", { name: "분석하기로 이동" });
    if (await goToAnalysisBtn.count() > 0) {
      await goToAnalysisBtn.click();
      await expect(page.getByRole("tab", { name: "분석하기" })).toHaveAttribute("aria-selected", "true");
    } else {
      await page.getByRole("tab", { name: "분석하기" }).click();
    }

    await page.getByRole("tab", { name: "분석하기" }).click();
    await expect(page.getByRole("tab", { name: "분석하기" })).toHaveAttribute("aria-selected", "true");

    const homeBackLink = page.getByRole("link", { name: "리뷰분석 홈으로 이동" });
    await expect(homeBackLink).toBeVisible();
    await homeBackLink.click();
    await expect(page).toHaveURL("/");
  });

test("dashboard mobile drawer and backdrop are operable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/dashboard");

    const openToggle = page.getByRole("button", { name: "사이드바 펼치기" });
    await expect(openToggle).toBeVisible();
    await openToggle.click();

    const closeToggle = page.getByRole("button", { name: "사이드바 닫기" });
    await expect(closeToggle).toBeVisible();

    const backdrop = page.getByTestId("dashboardBackdrop");
    await expect(backdrop).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(openToggle).toBeVisible();
    await expect(backdrop).toBeHidden();
  });

  test("dashboard mapping panel stays within card bounds on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "리뷰 CSV 분석" })).toBeVisible();

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

    await page.getByRole("button", { name: "다음: 미리보기" }).click();

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
