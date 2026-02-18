import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import PricingPage from "./page";

describe("/pricing page billing hints", () => {
  it("renders success message when billing=success", () => {
    const html = renderToStaticMarkup(<PricingPage searchParams={{ billing: "success" }} />);
    expect(html).toContain("결제가 완료되었습니다.");
  });

  it("renders cancel message when billing=cancel", () => {
    const html = renderToStaticMarkup(<PricingPage searchParams={{ billing: "cancel" }} />);
    expect(html).toContain("결제가 취소되었습니다.");
  });

  it("does not render billing hints for unrelated query params", () => {
    const html = renderToStaticMarkup(
      <PricingPage searchParams={{ billing: undefined, payment_success: "1" }} />
    );

    expect(html.includes("결제가 완료되었습니다.")).toBe(false);
    expect(html.includes("결제가 취소되었습니다.")).toBe(false);
  });
});
