/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "@/lib/i18n";
import AppShell from "./AppShell";

let mockPathname = "/pricing";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname
}));

vi.mock("next/link", () => ({
  default: (() => {
    type MockLinkProps = React.ComponentPropsWithoutRef<"a"> & { href: string };
    const LinkComponent = React.forwardRef<HTMLAnchorElement, MockLinkProps>(({ href, children, ...props }, ref) => (
      <a href={href} ref={ref} {...props}>
        {children}
      </a>
    ));
    LinkComponent.displayName = "MockLink";
    return LinkComponent;
  })()
}));

vi.mock("@/app/(auth)/actions", () => ({
  signOutAction: "/logout"
}));

describe("AppShell", () => {
  function renderWithI18n(children: React.ReactElement) {
    return render(<I18nProvider>{children}</I18nProvider>);
  }

  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440
    });
  });

  afterEach(() => {
    cleanup();
    mockPathname = "/pricing";
    document.body.className = "";
  });

  it("renders the marketing header and footer on public pages", () => {
    renderWithI18n(
      <AppShell userEmail="tester@example.com" plan="basic">
        <div>내용</div>
      </AppShell>
    );

    expect(screen.getByRole("link", { name: "Pricing" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "CSV" })).toBeTruthy();
    expect(screen.getAllByRole("navigation").length).toBe(1);
    expect(screen.getByText("support@reviewboost.co.kr")).toBeTruthy();
  });

  it("uses the workspace rail and hides the footer on dashboard pages", () => {
    mockPathname = "/dashboard";

    renderWithI18n(
      <AppShell userEmail="tester@example.com" plan="basic">
        <div>대시보드 내용</div>
      </AppShell>
    );

    const sidebar = screen.getByRole("complementary", { name: "주요 메뉴" });
    expect(within(sidebar).getByRole("link", { name: "홈" }).getAttribute("aria-current")).toBe("page");
    expect(within(sidebar).getByRole("link", { name: "AI분석" })).toBeTruthy();
    expect(within(sidebar).getByRole("link", { name: "리뷰 다운" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "홈" })).toBeTruthy();
    expect(screen.queryByText("support@reviewboost.co.kr")).toBeNull();
    expect(screen.getAllByRole("navigation").length).toBe(1);
  });

  it("opens the workspace drawer on mobile widths", () => {
    mockPathname = "/dashboard";
    window.innerWidth = 900;

    renderWithI18n(
      <AppShell userEmail="tester@example.com" plan="basic">
        <div>대시보드 내용</div>
      </AppShell>
    );

    const toggle = screen.getByRole("button", { name: "메뉴 열기" });
    expect(screen.queryByLabelText("주요 메뉴")).toBeNull();

    fireEvent.click(toggle);

    expect(screen.getByRole("button", { name: "메뉴 닫기" })).toBeTruthy();
    expect(screen.getAllByRole("complementary", { name: "주요 메뉴" }).length).toBe(1);
  });
});
