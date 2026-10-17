/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import HomePageContent from "./HomePageContent";

describe("HomePageContent", () => {
  it("renders the new hero and the full landing section sequence", () => {
    render(
      <I18nProvider>
        <HomePageContent />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("쇼핑몰 리뷰 수집부터");
    expect(screen.getAllByRole("link", { name: "Chrome에 무료로 설치" })[0].getAttribute("href")).toContain("chromewebstore.google.com");
    expect(screen.getByRole("link", { name: "월 4,900원으로 시작" }).getAttribute("href")).toBe("/extension-connect?checkout=1");
    expect(screen.getByRole("link", { name: "이미 파일이 있다면 분석하기" }).getAttribute("href")).toBe("/dashboard/analyze");
    const promo = document.querySelector<HTMLVideoElement>('video');
    expect(promo?.querySelector("source")?.getAttribute("src")).toBe("/extension-promo.mp4");
    expect(promo?.hasAttribute("controls")).toBe(true);
    expect(promo?.hasAttribute("autoplay")).toBe(false);
  });
});
