import { clerkSetup } from "@clerk/testing/playwright";
import { test as setup } from "@playwright/test";

// Fetches a Clerk Testing Token (bypasses bot detection) for the dev instance.
// Requires CLERK_SECRET_KEY + a publishable key in the environment (loaded from
// .env.local by playwright.config.ts).
setup("clerk global setup", async ({ page }) => {
  await clerkSetup({ publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY });

  // Warm up dev-mode compilation of the routes the tests hit so the first real
  // test doesn't race a cold Webpack compile (which can exceed Clerk's load wait).
  for (const path of ["/", "/dashboard", "/dashboard/analyze", "/pricing"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" }).catch(() => {});
  }
});
