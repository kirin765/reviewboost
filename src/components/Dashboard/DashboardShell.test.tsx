/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
  });

  it("adds dashboardMode class and exposes nav controls", () => {
    render(<DashboardShell>내용</DashboardShell>);

    expect(document.body.classList.contains("dashboardMode")).toBe(true);
    expect(screen.getAllByRole("button", { name: "사이드바 닫기" })[0]).toBeTruthy();
    expect(screen.getAllByRole("navigation", { name: "대시보드 메뉴" })[0]).toBeTruthy();
    expect(screen.getByText("ReviewBoost 분석도구")).toBeTruthy();
  });

  it("toggles drawer state with button", () => {
    render(<DashboardShell>내용</DashboardShell>);

    const toggle = screen.getAllByRole("button", { name: "사이드바 닫기" })[0];
    const drawer = screen.getAllByLabelText("대시보드 탐색")[0];
    const backdrop = screen.getAllByTestId("dashboardBackdrop")[0];

    expect(drawer.className).toContain("dashboardDrawer");
    expect(backdrop).toHaveProperty("hidden", false);

    fireEvent.click(toggle);

    expect(screen.getAllByRole("button", { name: "사이드바 펼치기" })[0]).toBeTruthy();
    expect(backdrop).toHaveProperty("hidden", true);

    fireEvent.click(screen.getAllByRole("button", { name: "사이드바 펼치기" })[0]);
    expect(screen.getAllByRole("button", { name: "사이드바 닫기" })[0]).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.getAllByRole("button", { name: "사이드바 펼치기" })[0]).toBeTruthy();
  });

  it("returns focus to toggle when drawer closes", () => {
    render(<DashboardShell>내용</DashboardShell>);

    const firstTabLink = screen.getAllByRole("link", { name: "분석하기 CSV 업로드·미리보기·분석" })[0];
    const toggle = screen.getAllByRole("button", { name: "사이드바 닫기" })[0];

    firstTabLink.focus();
    fireEvent.click(toggle);

    expect(document.activeElement).toBe(toggle);
  });
});
