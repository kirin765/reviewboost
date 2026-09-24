// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { StreamMessage } from "../src/lib/messages";
import { reviewsToCsv } from "../src/lib/csv";
import { reviewsToXlsx } from "../src/lib/xlsx";
import { addHistory } from "../src/lib/history";

vi.mock("../src/lib/csv", () => ({ reviewsToCsv: vi.fn(() => "csv") }));
vi.mock("../src/lib/xlsx", () => ({ reviewsToXlsx: vi.fn(() => new Uint8Array()) }));
vi.mock("../src/lib/history", () => ({
  addHistory: vi.fn(async () => []), loadHistory: vi.fn(async () => []),
  clearHistory: vi.fn(), removeHistory: vi.fn(), makeHistoryId: () => "test"
}));

describe("popup preserves product context in exports and history", () => {
  let listener: (message: StreamMessage) => void;
  async function open(title: string) {
    document.documentElement.innerHTML = readFileSync("public/popup.html", "utf8");
    vi.stubGlobal("chrome", {
      runtime: { id: "test", onMessage: { addListener: vi.fn(fn => { listener = fn; }) } },
      tabs: {
        query: vi.fn(async () => [{ id: 1, url: "https://www.coupang.com/vp/products/123" }]),
        sendMessage: vi.fn(async () => ({ type: "PONG", ctx: { platform: "coupang", productId: "123", title } }))
      },
      storage: { local: { get: vi.fn(async () => ({})), set: vi.fn(async () => {}) } }
    });
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true })));
    vi.stubGlobal("URL", Object.assign(URL, { createObjectURL: vi.fn(() => "blob:test"), revokeObjectURL: vi.fn() }));
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    await import("../src/popup/popup");
    await vi.waitFor(() => expect((document.getElementById("collect") as HTMLButtonElement).disabled).toBe(false));
  }
  beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
  it.each(["", "가상 상품명"])("exports the detected title %j without using the popup title", async title => {
    await open(title);
    const reviews = [{ text: "가상 리뷰", rating: 5 }];
    listener({ type: "DONE", reviews });
    document.getElementById("dl-csv")!.click();
    document.getElementById("dl-xlsx")!.click();
    const context = { productNo: "123", productTitle: title };
    expect(reviewsToCsv).toHaveBeenCalledWith(reviews, context);
    expect(reviewsToXlsx).toHaveBeenCalledWith(reviews, context);
    expect(addHistory).toHaveBeenCalledWith(expect.objectContaining({ productTitle: title }));
  });
});
