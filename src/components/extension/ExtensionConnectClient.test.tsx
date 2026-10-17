// @vitest-environment jsdom
import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ query: "", checkout: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams(mocks.query) }));
vi.mock("@/lib/extensionBridge", () => ({ requestExtension: vi.fn().mockResolvedValue({ ok: true }) }));
vi.mock("./PaddleCheckoutOverlay", () => ({
  default: (props: { label: string; autoOpen?: boolean }) => {
    mocks.checkout(props);
    return <button>{props.label}</button>;
  }
}));

import ExtensionConnectClient from "./ExtensionConnectClient";

const free = { authenticated: true, tier: "free", day: "2026-10-06", limit: 50, used: 50, remaining: 0 };
const paid = { ...free, tier: "paid", limit: null, used: null, remaining: null };
const guest = { ...free, authenticated: false, tier: "anonymous" };
const response = (data: unknown) => Promise.resolve(new Response(JSON.stringify(data)));
async function flush() { await act(async () => { await Promise.resolve(); }); }

beforeEach(() => {
  vi.stubGlobal("React", React);
  vi.useFakeTimers();
  mocks.query = "";
  mocks.checkout.mockClear();
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("extension payment recovery", () => {
  it("guides a guest returning from payment to login without offering another purchase", async () => {
    mocks.query = "billing=success&checkout=1";
    vi.stubGlobal("fetch", vi.fn(() => response(guest)));
    render(<ExtensionConnectClient />);
    await flush();
    expect(screen.getByRole("link", { name: "로그인하고 연결하기" }).getAttribute("href")).toContain("billing%3Dsuccess");
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("does not open checkout while the paid account status is still loading", async () => {
    mocks.query = "checkout=1";
    let finish!: (r: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { finish = resolve; })));
    render(<ExtensionConnectClient />);
    expect(mocks.checkout).not.toHaveBeenCalled();
    await act(async () => { finish(new Response(JSON.stringify(paid))); });
    expect(screen.getByText("익스텐션 유료 (무제한)")).toBeTruthy();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("retries a delayed guest claim and updates to paid without another checkout", async () => {
    mocks.query = "billing=success&checkout=1";
    let ready = false;
    const fetchMock = vi.fn((url: string) => response(url === "/api/billing/claim" ? { claimed: ready ? 1 : 0 } : ready ? paid : free));
    vi.stubGlobal("fetch", fetchMock);
    render(<ExtensionConnectClient />);
    await flush();
    expect(mocks.checkout).not.toHaveBeenCalled();
    ready = true;
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByText("익스텐션 유료 (무제한)")).toBeTruthy();
    expect(mocks.checkout).not.toHaveBeenCalled();
    const calls = fetchMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("stops automatic recovery and offers a retry and support when the account stays free", async () => {
    mocks.query = "billing=success";
    const fetchMock = vi.fn((url: string) => response(url === "/api/billing/claim" ? { claimed: 0 } : free));
    vi.stubGlobal("fetch", fetchMock);
    render(<ExtensionConnectClient />);
    await flush();
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(screen.getByRole("button", { name: "구독 다시 확인" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "결제 연결 문의하기" })).toBeTruthy();
    expect(mocks.checkout).not.toHaveBeenCalled();
    const calls = fetchMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("claims an existing guest purchase before considering automatic checkout", async () => {
    mocks.query = "checkout=1";
    let claimed = false;
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (url === "/api/billing/claim") { claimed = true; return response({ claimed: 1 }); }
      return response(claimed ? paid : free);
    }));
    render(<ExtensionConnectClient />);
    await flush();
    expect(screen.getByText("익스텐션 유료 (무제한)")).toBeTruthy();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("still offers checkout to a free customer when no paid subscription is found", async () => {
    mocks.query = "checkout=1";
    vi.stubGlobal("fetch", vi.fn((url: string) => response(url === "/api/billing/claim" ? { claimed: 0 } : free)));
    render(<ExtensionConnectClient />);
    await flush();
    expect(screen.getByText("오늘 4,900원 결제 · 부가세 포함")).toBeTruthy();
    expect(mocks.checkout).toHaveBeenCalledWith(expect.objectContaining({ label: "월 4,900원 구독하기" }));
    expect(mocks.checkout.mock.calls.every(([props]) => !props.autoOpen)).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "이미 결제했다면 구독 연결 확인" }));
    await flush();
    expect(screen.queryByRole("button", { name: "월 4,900원 구독하기" })).toBeNull();
  });

  it("shows a failed claim and allows recovery without opening checkout", async () => {
    mocks.query = "billing=success";
    let fail = true;
    vi.stubGlobal("fetch", vi.fn((url: string) => {
      if (url === "/api/billing/claim") return Promise.resolve(new Response("{}", { status: 503 }));
      return response(fail ? free : paid);
    }));
    render(<ExtensionConnectClient />);
    await flush();
    expect(screen.getByRole("alert").textContent).toContain("구독을 연결하지 못했습니다");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "구독 다시 확인" }));
    await flush();
    expect(screen.getByText("익스텐션 유료 (무제한)")).toBeTruthy();
    expect(mocks.checkout).not.toHaveBeenCalled();
  });

  it("cancels recovery when the customer leaves the page", async () => {
    mocks.query = "billing=success";
    const fetchMock = vi.fn((url: string) => response(url === "/api/billing/claim" ? { claimed: 0 } : free));
    vi.stubGlobal("fetch", fetchMock);
    const view = render(<ExtensionConnectClient />);
    await flush();
    view.unmount();
    const calls = fetchMock.mock.calls.length;
    await act(async () => { await vi.advanceTimersByTimeAsync(60000); });
    expect(fetchMock.mock.calls.length).toBe(calls);
  });
});
