// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { afterEach, expect, it, vi } from "vitest";
import type { StreamMessage } from "../src/lib/messages";

vi.mock("../src/lib/usage", () => ({
  loadUsage: async () => ({ authenticated: false, tier: "anonymous", remaining: 50, limit: 50, used: 0 }),
  isConnected: async () => false,
  recordCollected: async () => {},
  reportLimitHit: async () => {},
  clampToRemaining: (requested: number) => requested,
  isQuotaExhausted: () => false
}));
afterEach(() => { vi.unstubAllGlobals(); vi.resetModules(); });

it("shows partial counts, keeps them when history is restored, and disables text analysis for ratings only", async () => {
  document.body.innerHTML = readFileSync("public/popup.html", "utf8");
  const data: Record<string, unknown> = {};
  let receive!: (msg: StreamMessage) => void;
  vi.stubGlobal("chrome", {
    runtime: { id: "test", onMessage: { addListener: (fn: typeof receive) => { receive = fn; } } },
    tabs: { query: async () => [{ id: 1, url: "https://www.coupang.com/vp/products/123" }],
      sendMessage: async () => ({ type: "PONG", ctx: { platform: "coupang", productId: "123", title: "상품" } }) },
    storage: { local: { get: async () => data, set: async (value: object) => Object.assign(data, value), remove: async () => {} } }
  });
  await import("../src/popup/popup");
  await vi.waitFor(() => expect(document.getElementById("ctx")?.textContent).toContain("쿠팡"));
  receive({ type: "DONE", reviews: [{ text: "맛있어요", rating: 5 }, { text: "", rating: 4 }],
    summary: { reportedTotal: 1667, requested: 1667, collected: 2, textReviews: 1, partial: true } });
  expect(document.getElementById("count")?.textContent).toBe("2");
  expect(document.getElementById("collection-summary")?.textContent).toContain("1,667");
  expect(document.getElementById("collection-summary")?.textContent).toContain("일부만 수집");
  expect(document.getElementById("collection-summary")?.textContent).toContain("글이 있는 리뷰 1개");
  await vi.waitFor(() => expect(document.querySelector('[data-action="restore"]')).not.toBeNull());
  document.getElementById("collection-summary")!.textContent = "";
  (document.querySelector('[data-action="restore"]') as HTMLButtonElement).click();
  await vi.waitFor(() => expect(document.getElementById("collection-summary")?.textContent).toContain("일부만 수집"));
  receive({ type: "DONE", reviews: [{ text: "", rating: 3 }],
    summary: { reportedTotal: 1, requested: 10, collected: 1, textReviews: 0, partial: false } });
  expect((document.getElementById("analyze") as HTMLButtonElement).disabled).toBe(true);
  expect((document.getElementById("dl-csv") as HTMLButtonElement).disabled).toBe(false);
  expect(document.getElementById("collection-summary")?.textContent).not.toContain("일부만 수집");
});

it("loads the saved blank-text option and sends it with COLLECT_START", async () => {
  document.body.innerHTML = readFileSync("public/popup.html", "utf8");
  const data: Record<string, unknown> = { rb_prefs: { includeBlankText: false } };
  const sent: { type?: string }[] = [];
  vi.stubGlobal("chrome", {
    runtime: { id: "test", onMessage: { addListener: () => {} } },
    tabs: {
      query: async () => [{ id: 1, url: "https://www.coupang.com/vp/products/123" }],
      sendMessage: async (_id: number, msg: { type?: string }) => {
        sent.push(msg);
        return { type: "PONG", ctx: { platform: "coupang", productId: "123", title: "상품" } };
      }
    },
    storage: { local: { get: async () => data, set: async (v: object) => Object.assign(data, v), remove: async () => {} } }
  });
  await import("../src/popup/popup");
  await vi.waitFor(() => expect((document.getElementById("include-blank-text") as HTMLInputElement).checked).toBe(false));
  await vi.waitFor(() => expect((document.getElementById("collect") as HTMLButtonElement).disabled).toBe(false));
  (document.getElementById("collect") as HTMLButtonElement).click();
  expect(sent[sent.length - 1]).toMatchObject({ type: "COLLECT_START", includeBlankText: false });
});
