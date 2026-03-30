import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PricingPage from "./page";

async function renderPricingPage(searchParams?: { billing?: string; payment_success?: string }) {
  const element = await PricingPage({
    searchParams: Promise.resolve(searchParams ?? {})
  });
  return renderToStaticMarkup(element);
}

describe("/pricing page billing hints", () => {
  it("emphasizes the recommended Basic plan", async () => {
    const html = await renderPricingPage();
    expect(html).toContain("Recommended");
    expect(html).toContain("Basic");
  });

  it("renders success message when billing=success", async () => {
    const html = await renderPricingPage({ billing: "success" });
    expect(html).toContain("결제가 완료되었습니다.");
  });

  it("renders cancel message when billing=cancel", async () => {
    const html = await renderPricingPage({ billing: "cancel" });
    expect(html).toContain("결제가 취소되었습니다.");
  });

  it("does not render billing hints for unrelated query params", async () => {
    const html = await renderPricingPage({ billing: undefined, payment_success: "1" });

    expect(html.includes("결제가 완료되었습니다.")).toBe(false);
    expect(html.includes("결제가 취소되었습니다.")).toBe(false);
  });
});
