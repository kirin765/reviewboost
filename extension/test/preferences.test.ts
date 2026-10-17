// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PREFERENCES, loadPreferences, normalizePreferences, savePreferences } from "../src/lib/preferences";

afterEach(() => vi.unstubAllGlobals());

describe("normalizePreferences", () => {
  it("defaults to including blank-text reviews", () => {
    expect(normalizePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
    expect(normalizePreferences({})).toEqual({ includeBlankText: true });
    expect(normalizePreferences({ includeBlankText: "yes" })).toEqual({ includeBlankText: true });
  });
  it("respects a stored boolean", () => {
    expect(normalizePreferences({ includeBlankText: false })).toEqual({ includeBlankText: false });
  });
});

describe("loadPreferences / savePreferences", () => {
  it("round-trips through chrome.storage.local", async () => {
    const data: Record<string, unknown> = {};
    vi.stubGlobal("chrome", {
      storage: {
        local: {
          get: async (key: string) => ({ [key]: data[key] }),
          set: async (value: object) => Object.assign(data, value)
        }
      }
    });
    await savePreferences({ includeBlankText: false });
    expect(await loadPreferences()).toEqual({ includeBlankText: false });
  });
  it("falls back to defaults when storage read fails", async () => {
    vi.stubGlobal("chrome", {
      storage: { local: { get: async () => { throw new Error("storage unavailable"); } } }
    });
    expect(await loadPreferences()).toEqual(DEFAULT_PREFERENCES);
  });
});
