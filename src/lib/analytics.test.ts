// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { gtagEvent, pageview } from "./analytics";
import { captureAcquisition, getCheckoutAnalytics } from "./checkout-analytics";
import { sanitizeCheckoutAttribution } from "./checkout-attribution";

beforeEach(() => {
  delete window.gtag;
  delete window.dataLayer;
  delete window.reviewboostGaConfigured;
  localStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

describe("analytics before the Google script is ready", () => {
  it("queues early conversions after configuration, with no automatic duplicate pageview", () => {
    gtagEvent("signup");
    pageview("/pricing");
    const commands = window.dataLayer!.map(value => Array.from(value as IArguments));
    expect(commands.map(command => command[0])).toEqual(["js", "config", "event", "event"]);
    expect(commands[1][2]).toMatchObject({ send_page_view: false });
    expect(commands[2][1]).toBe("signup");
    expect(commands[3][1]).toBe("page_view");
  });
  it("strips login tickets and email from queued page views while keeping campaign labels", () => {
    window.history.replaceState({}, "", "/login?__clerk_ticket=secret&email=private@example.com&utm_source=naver");
    pageview(window.location.href);
    const queued = JSON.stringify(window.dataLayer, (_, value) => Object.prototype.toString.call(value) === "[object Arguments]" ? Array.from(value) : value);
    expect(queued).not.toContain("secret");
    expect(queued).not.toContain("private@example.com");
    expect(queued).toContain("utm_source=naver");
  });
  it("retains campaign attribution across the install and checkout visits", () => {
    window.history.replaceState({}, "", "/?utm_source=naver&utm_medium=blog&utm_campaign=export");
    captureAcquisition();
    window.history.replaceState({}, "", "/extension-connect?checkout=1");
    expect(captureAcquisition()).toEqual({ acquisition_source: "naver", acquisition_medium: "blog", acquisition_campaign: "export" });
  });
  it("does not prevent checkout when analytics is blocked", async () => {
    vi.useFakeTimers();
    try {
      const result = getCheckoutAnalytics();
      await vi.advanceTimersByTimeAsync(801);
      expect(await result).toEqual({ acquisition_source: "direct", acquisition_medium: "none" });
    } finally { vi.useRealTimers(); }
  });
  it("passes only validated analytics metadata, never identity or query strings", () => {
    expect(sanitizeCheckoutAttribution({ user_id: "victim", ga_client_id: "123.456", ga_session_id: "789", acquisition_source: "a@example.com", acquisition_campaign: "?token=secret", email: "private" })).toEqual({ ga_client_id: "123.456", ga_session_id: "789" });
  });
});
