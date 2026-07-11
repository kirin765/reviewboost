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

vi.mock("@clerk/nextjs", () => ({
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
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

    expect(screen.getByText("게스트")).toBeTruthy();
    expect(screen.getByText("Free")).toBeTruthy();
    expect(screen.getByRole("link", { name: "로그인" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "홈" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "AI분석" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "요금제" })).toBeTruthy();
  });

  it("renders authenticated profile footer with the primary workspace links", () => {
    renderWithI18n(<SidebarNav variant="app" plan="basic" userEmail="tester@example.com" />);

    expect(screen.getByText("Tester")).toBeTruthy();
    expect(screen.getByText("Basic")).toBeTruthy();
    expect(screen.getByRole("button", { name: "로그아웃" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "홈" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "AI분석" })).toBeTruthy();
  });

  it("keeps resource links available and shows the pro plan button", () => {
    mockPathname = "/dashboard/analyze";
    renderWithI18n(<SidebarNav variant="dashboard" plan="pro" userEmail="owner@example.com" />);

    expect(screen.getByRole("link", { name: "AI분석" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("link", { name: "요금제" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "사용법" })).toBeTruthy();
  });

  it("treats saved report detail routes as home-active", () => {
    mockPathname = "/dashboard/analysis/abc123";
    renderWithI18n(<SidebarNav variant="dashboard" plan="basic" userEmail="owner@example.com" />);

    expect(screen.getByRole("link", { name: "홈" }).getAttribute("aria-current")).toBe("page");
  });
});
