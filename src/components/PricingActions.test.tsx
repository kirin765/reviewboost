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
  let fetchMock: ReturnType<typeof vi.fn>;
  let assignMock: ReturnType<typeof vi.fn>;
  let paddleOpenMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    fetchMock = vi.fn();
    assignMock = vi.fn();
    paddleOpenMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);
    Object.defineProperty(window, "location", {
      value: { assign: assignMock },
      configurable: true
    });
    Object.defineProperty(window, "Paddle", {
      value: {
        Checkout: {
          open: paddleOpenMock
        }
      },
      configurable: true
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
  });

  it("calls the server checkout endpoint and redirects to the returned url", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ url: "https://checkout.paddle.com/c/test" }), {
        status: 200,
        headers: { "content-type": "application/json" }
      })
    );

    render(<PricingActions plan="basic" userId="usr_123" />);

    fireEvent.click(screen.getByRole("button", { name: "Basic 시작하기" }));

    expect(screen.getByRole("button", { name: "연결 중..." }).hasAttribute("disabled")).toBe(true);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: "basic" })
      });
    });

    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith("https://checkout.paddle.com/c/test");
    });

    expect(paddleOpenMock).not.toHaveBeenCalled();
  });

  it("shows auth error returned by the checkout api", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "로그인이 필요합니다." }), {
        status: 401,
        headers: { "content-type": "application/json" }
      })
    );

    render(<PricingActions plan="pro" userId="usr_123" />);

    fireEvent.click(screen.getByRole("button", { name: "Pro 시작하기" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("로그인이 필요합니다.");
    });

    expect(assignMock).not.toHaveBeenCalled();
    expect(paddleOpenMock).not.toHaveBeenCalled();
  });

  it("shows configuration error returned by the checkout api", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "결제 설정이 아직 완료되지 않았습니다." }), {
        status: 503,
        headers: { "content-type": "application/json" }
      })
    );

    render(<PricingActions plan="basic" userId="usr_123" />);

    fireEvent.click(screen.getByRole("button", { name: "Basic 시작하기" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("결제 설정이 아직 완료되지 않았습니다.");
    });

    expect(assignMock).not.toHaveBeenCalled();
    expect(paddleOpenMock).not.toHaveBeenCalled();
  });

  it("shows generic error when checkout api fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "결제 세션 생성 중 오류가 발생했습니다." }), {
        status: 500,
        headers: { "content-type": "application/json" }
      })
    );

    render(<PricingActions plan="pro" userId="usr_123" />);

    fireEvent.click(screen.getByRole("button", { name: "Pro 시작하기" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("결제 세션 생성 중 오류가 발생했습니다.");
    });

    expect(assignMock).not.toHaveBeenCalled();
    expect(paddleOpenMock).not.toHaveBeenCalled();
  });

  it("shows auth error before calling the server when user is not signed in", async () => {
    render(<PricingActions plan="pro" />);

    fireEvent.click(screen.getByRole("button", { name: "Pro 시작하기" }));

    await waitFor(() => {
      expect(screen.getByRole("alert").textContent ?? "").toContain("로그인이 필요합니다.");
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(assignMock).not.toHaveBeenCalled();
  });
});
