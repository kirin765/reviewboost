/** @vitest-environment jsdom */

import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import HomePageContent from "./HomePageContent";

describe("HomePageContent", () => {
  it("renders translated copy instead of raw translation keys", () => {
    render(
      <I18nProvider>
        <HomePageContent />
      </I18nProvider>
    );

    expect(screen.getByRole("heading", { name: "리뷰를 업로드하면 우선순위와 실행 액션이 바로 정리됩니다." })).toBeTruthy();
    expect(screen.queryByText("home.heroTitle")).toBeNull();
    expect(screen.queryByText("home.heroLead")).toBeNull();
  });
});
