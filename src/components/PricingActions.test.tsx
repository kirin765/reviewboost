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
  const openMock = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "Paddle",
      {
        Checkout: {
          open: openMock
        }
      }
    );
    openMock.mockReset();
  });

  it("opens Paddle checkout directly with plan + callback urls", async () => {
    render(
      <PricingActions
        plan="basic"
        priceId="pri_basic"
        userId="usr_123"
        userEmail="basic@example.com"
      />
    );

    const button = screen.getByRole("button", { name: "Basic 시작하기" });
    fireEvent.click(button);

    expect(screen.getByRole("button", { name: "연결 중..." }).hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      expect(openMock).toHaveBeenCalledWith({
        items: [{ priceId: "pri_basic", quantity: 1 }],
        customData: { user_id: "usr_123", plan_tier: "basic" },
        customer: { email: "basic@example.com" },
        settings: {
          successUrl: expect.stringContaining("/pricing?billing=success&plan=basic"),
          cancelUrl: expect.stringContaining("/pricing?billing=cancel&plan=basic")
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Basic 시작하기" }).hasAttribute("disabled")).toBe(false);
    });
  });

  it("renders missing plan config error and resets loading state", async () => {
    render(<PricingActions plan="pro" priceId="" />);

    fireEvent.click(screen.getByRole("button", { name: "Pro 시작하기" }));

    expect(screen.getByRole("button", { name: "연결 중..." }).hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("요금제 가격 ID가 아직 설정되지 않았습니다.");
    });

    expect(screen.getByRole("button", { name: "Pro 시작하기" }).hasAttribute("disabled")).toBe(false);
  });

  it("renders auth error when user is not signed in", async () => {
    render(
      <PricingActions
        plan="pro"
        priceId="pri_pro"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Pro 시작하기" }));

    expect(screen.getByRole("button", { name: "연결 중..." }).hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("로그인이 필요합니다.");
    });

    expect(screen.getByRole("button", { name: "Pro 시작하기" }).hasAttribute("disabled")).toBe(false);
  });
});
