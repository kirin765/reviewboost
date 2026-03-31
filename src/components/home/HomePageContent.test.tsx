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

    expect(screen.getByRole("heading", { name: "리뷰에서 상품의 문제를 찾아 매출을 개선하세요" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "리뷰 분석" })).toBeTruthy();
    expect(screen.getAllByRole("link", { name: "URL을 통한 CSV 다운로드" }).length).toBeGreaterThan(0);
    expect(Array.from(document.querySelectorAll("[data-home-section]")).map((node) => node.getAttribute("data-home-section"))).toEqual([
      "hero",
      "problem",
      "solution",
      "product",
      "result",
      "pricing",
      "faq",
      "cta"
    ]);
    expect(screen.queryByText("home.heroTitle")).toBeNull();
    expect(screen.queryByText("home.heroLead")).toBeNull();
  });
});
