/** @vitest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/FeedbackModal", () => ({
  default: ({ title, message }: { title: string; message: string }) => (
    <div role="alert">
      <strong>{title}</strong>
      <span>{message}</span>
    </div>
  )
}));

import PricingActions from "./PricingActions";

describe("PricingActions", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading during checkout and redirects to returned url", async () => {
    const originalLocation = window.location;
    Object.defineProperty(window, "location", {
      value: { href: "https://reviewboost.app/pricing" },
      writable: true,
      configurable: true
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ url: "https://checkout.paddle.com/c/test" })
      })
    );

    render(<PricingActions plan="basic" />);

    const button = screen.getByRole("button", { name: "Basic 시작하기" });
    fireEvent.click(button);

    expect(screen.getByRole("button", { name: "연결 중..." }).hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      expect(window.location.href).toBe("https://checkout.paddle.com/c/test");
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Basic 시작하기" }).hasAttribute("disabled")).toBe(false);
    });

    Object.defineProperty(window, "location", {
      value: originalLocation,
      configurable: true
    });
  });

  it("renders api error messages and resets loading state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "결제 설정이 아직 완료되지 않았습니다." })
      })
    );

    render(<PricingActions plan="pro" />);

    fireEvent.click(screen.getByRole("button", { name: "Pro 시작하기" }));

    expect(screen.getByRole("button", { name: "연결 중..." }).hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("결제 설정이 아직 완료되지 않았습니다.");
    });

    expect(screen.getByRole("button", { name: "Pro 시작하기" }).hasAttribute("disabled")).toBe(false);
  });
});
