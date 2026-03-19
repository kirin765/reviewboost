/** @vitest-environment jsdom */

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  let checkoutOpenMock: ReturnType<typeof vi.fn>;
  const baseEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    checkoutOpenMock = vi.fn();
    process.env = {
      ...baseEnv,
      PADDLE_ENV: "sandbox",
      NEXT_PUBLIC_PADDLE_TOKEN_SANDBOX: "test_token"
    };
    Object.defineProperty(window, "Paddle", {
      value: {
        Checkout: {
          open: checkoutOpenMock
        }
      },
      configurable: true
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    process.env = { ...baseEnv };
  });

  it("opens Paddle checkout with required args", async () => {
    const origin = "https://reviewboost.app";
    vi.stubGlobal("location", { origin } as Location);

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
      expect(checkoutOpenMock).toHaveBeenCalledWith({
        items: [{ priceId: "pri_basic", quantity: 1 }],
        customData: {
          user_id: "usr_123",
          plan_tier: "basic"
        },
        customer: {
          email: "basic@example.com"
        },
        settings: {
          successUrl: `${origin}/pricing?billing=success&plan=basic`
        }
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Basic 시작하기" }).hasAttribute("disabled")).toBe(false);
    });
  });

  it("shows module-not-ready error when Paddle SDK is unavailable", async () => {
    Object.defineProperty(window, "Paddle", {
      value: undefined,
      configurable: true
    });

    render(
      <PricingActions
        plan="basic"
        priceId="pri_basic"
        userId="usr_123"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Basic 시작하기" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("Paddle 결제 모듈이 아직 준비되지 않았습니다.");
    }, { timeout: 3500 });
  });

  it("shows module-not-ready error when Paddle SDK exists but is not initialized", async () => {
    Object.defineProperty(window, "Paddle", {
      value: {
        Initialized: false,
        Checkout: {
          open: checkoutOpenMock
        }
      },
      configurable: true
    });

    render(
      <PricingActions
        plan="basic"
        priceId="pri_basic"
        userId="usr_123"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Basic 시작하기" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("Paddle 결제 모듈이 아직 준비되지 않았습니다.");
    }, { timeout: 3500 });
    expect(checkoutOpenMock).not.toHaveBeenCalled();
  });

  it("renders missing plan config error and resets loading state", async () => {
    render(<PricingActions plan="pro" priceId="" />);

    fireEvent.click(screen.getByRole("button", { name: "Pro 시작하기" }));

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

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("로그인이 필요합니다.");
    });

    expect(screen.getByRole("button", { name: "Pro 시작하기" }).hasAttribute("disabled")).toBe(false);
  });
});
