/** @vitest-environment jsdom */

import React from "react";
import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  useSearchParams: vi.fn(),
  gtagEvent: vi.fn()
}));

vi.mock("next/navigation", () => ({
  useSearchParams: mocks.useSearchParams
}));

vi.mock("@/lib/analytics", () => ({
  gtagEvent: mocks.gtagEvent
}));

import AnalyticsQueryEvents from "./AnalyticsQueryEvents";

describe("AnalyticsQueryEvents payment_success handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useSearchParams.mockReturnValue(
      new URLSearchParams("payment_success=1&value=39000&currency=KRW&transaction_id=tx-1")
    );
  });

  it("tracks payment event and strips processed query params", async () => {
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    render(<AnalyticsQueryEvents />);

    await waitFor(() => {
      expect(mocks.gtagEvent).toHaveBeenCalledWith("payment", {
        value: 39000,
        currency: "KRW",
        transaction_id: "tx-1"
      });
    });

    expect(replaceSpy).toHaveBeenCalled();
    const nextUrl = String(replaceSpy.mock.calls.at(-1)?.[2] ?? "");
    expect(nextUrl.includes("payment_success")).toBe(false);
    expect(nextUrl.includes("transaction_id")).toBe(false);
  });

  it("tracks payment on Paddle billing=success return and strips billing", async () => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams("billing=success&plan=extension&ext=abc"));
    const replaceSpy = vi.spyOn(window.history, "replaceState");

    render(<AnalyticsQueryEvents />);

    await waitFor(() => {
      expect(mocks.gtagEvent).toHaveBeenCalledWith("payment", {
        value: 0,
        currency: "KRW",
        transaction_id: undefined
      });
    });

    const nextUrl = String(replaceSpy.mock.calls.at(-1)?.[2] ?? "");
    expect(nextUrl.includes("billing=success")).toBe(false);
    expect(nextUrl.includes("plan=extension")).toBe(true);
  });

  it("does not track payment on billing=cancel", async () => {
    mocks.useSearchParams.mockReturnValue(new URLSearchParams("billing=cancel&plan=extension"));

    render(<AnalyticsQueryEvents />);

    await new Promise((r) => setTimeout(r, 0));
    expect(mocks.gtagEvent).not.toHaveBeenCalled();
  });
});
