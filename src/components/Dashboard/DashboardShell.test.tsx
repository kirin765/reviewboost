/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DashboardShell from "./DashboardShell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard"
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

describe("DashboardShell", () => {
  beforeEach(() => {
    document.body.className = "";
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1440
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("adds dashboardMode class and exposes nav controls", () => {
    render(<DashboardShell>내용</DashboardShell>);

    expect(document.body.classList.contains("dashboardMode")).toBe(true);
    expect(screen.getAllByRole("button", { name: "사이드바 닫기" })[0]).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "대시보드 메뉴" })[0]).toBeTruthy();
    expect(screen.getByText("ReviewBoost")).toBeTruthy();
  });

  it("toggles drawer state with button", () => {
    render(<DashboardShell>내용</DashboardShell>);

    const toggle = screen.getAllByRole("button", { name: "사이드바 닫기" })[0];
    const drawer = screen.getAllByLabelText("대시보드 탐색")[0];
    const backdrop = screen.getAllByTestId("dashboardBackdrop")[0];

    expect(drawer.className).toContain("dashboardDrawer");
    expect(backdrop).toHaveProperty("hidden", true);

    fireEvent.click(toggle);

    expect(screen.getAllByRole("button", { name: "사이드바 펼치기" })[0]).toBeTruthy();
    expect(backdrop).toHaveProperty("hidden", true);

    fireEvent.click(screen.getAllByRole("button", { name: "사이드바 펼치기" })[0]);
    expect(screen.getAllByRole("button", { name: "사이드바 닫기" })[0]).toBeTruthy();
  });

  it("returns focus to toggle when drawer closes", () => {
    render(<DashboardShell>내용</DashboardShell>);

    const firstTabLink = screen.getAllByRole("link", { name: /분석하기/ })[0];
    const toggle = screen.getAllByRole("button", { name: "사이드바 닫기" })[0];

    firstTabLink.focus();
    fireEvent.click(toggle);

    expect(document.activeElement).toBe(toggle);
  });

  it("shows logout action when user is authenticated", () => {
    render(
      <DashboardShell userEmail="tester@example.com">
        내용
      </DashboardShell>
    );

    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
    expect(screen.getByText("tester@example.com")).toBeTruthy();
  });

  it("hides logout action when user is not authenticated", () => {
    render(
      <DashboardShell userEmail={null}>
        내용
      </DashboardShell>
    );

    expect(screen.queryByRole("button", { name: "로그아웃" })).toBeNull();
  });
});
