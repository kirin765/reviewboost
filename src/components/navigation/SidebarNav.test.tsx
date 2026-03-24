/** @vitest-environment jsdom */

import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import SidebarNav from "./SidebarNav";
import { I18nProvider } from "@/lib/i18n";

let mockPathname = "/";

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

describe("SidebarNav", () => {
  function renderWithI18n(element: React.ReactElement) {
    return render(<I18nProvider>{element}</I18nProvider>);
  }

  afterEach(() => {
    cleanup();
    mockPathname = "/";
  });

  it("renders guest footer and hides history for unauthenticated state", () => {
    renderWithI18n(<SidebarNav variant="app" plan="free" userEmail={null} />);

    expect(screen.getByText("Guest")).toBeTruthy();
    expect(screen.getByText("로그인 후 리포트 저장")).toBeTruthy();
    expect(screen.getByRole("link", { name: "로그인" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "저장된 리포트" })).toBeNull();
    expect(screen.getByRole("link", { name: "쿠팡 CSV" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Upgrade Now" })).toBeTruthy();
  });

  it("renders authenticated profile footer and keeps history link", () => {
    renderWithI18n(<SidebarNav variant="app" plan="basic" userEmail="tester@example.com" />);

    expect(screen.getByText("Tester")).toBeTruthy();
    expect(screen.getByText("Basic Account")).toBeTruthy();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "저장된 리포트" })).toBeTruthy();
  });

  it("marks matching route active and switches promo copy for pro plan", () => {
    mockPathname = "/pricing";
    renderWithI18n(<SidebarNav variant="dashboard" plan="pro" userEmail="owner@example.com" />);

    expect(screen.getByRole("link", { name: "요금제" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "View Plans" })).toBeTruthy();
  });

  it("treats saved report detail routes as history-active", () => {
    mockPathname = "/dashboard/analysis/abc123";
    renderWithI18n(<SidebarNav variant="dashboard" plan="basic" userEmail="owner@example.com" />);

    expect(screen.getByRole("link", { name: "저장된 리포트" }).getAttribute("aria-current")).toBe("page");
  });

  it("marks coupang csv route active", () => {
    mockPathname = "/coupang-csv";
    renderWithI18n(<SidebarNav variant="dashboard" plan="basic" userEmail="owner@example.com" />);

    expect(screen.getByRole("link", { name: "쿠팡 CSV" }).getAttribute("aria-current")).toBe("page");
  });
});
