/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

  it("renders a single shared navigation rail and content header on content pages", () => {
    render(
      <AppShell userEmail="tester@example.com" plan="basic">
        <div>내용</div>
      </AppShell>
    );

    const sidebar = screen.getByRole("complementary", { name: "주요 메뉴" });
    expect(within(sidebar).getByRole("link", { name: "요금제" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getAllByRole("navigation").length).toBe(1);
    expect(screen.getByRole("heading", { name: "요금제" })).toBeTruthy();
    expect(screen.getByText("support@reviewboost.co.kr")).toBeTruthy();
  });

  it("hides the footer on workspace pages and keeps only one chrome shell", () => {
    mockPathname = "/dashboard";

    render(
      <AppShell userEmail="tester@example.com" plan="basic">
        <div>대시보드 내용</div>
      </AppShell>
    );

    expect(screen.getByRole("heading", { name: "리뷰 CSV 분석" })).toBeTruthy();
    expect(screen.queryByText("support@reviewboost.co.kr")).toBeNull();
    expect(screen.getAllByRole("navigation").length).toBe(1);
  });

  it("uses the shared drawer on mobile widths", () => {
    mockPathname = "/dashboard";
    window.innerWidth = 900;

    render(
      <AppShell userEmail="tester@example.com" plan="basic">
        <div>대시보드 내용</div>
      </AppShell>
    );

    const toggle = screen.getByRole("button", { name: "메뉴 열기" });
    const backdrop = screen.getByTestId("appShellBackdrop");

    expect(backdrop).toHaveProperty("hidden", true);

    fireEvent.click(toggle);

    expect(screen.getAllByRole("button", { name: "메뉴 닫기" }).length).toBe(2);
    expect(backdrop).toHaveProperty("hidden", false);
  });
});
