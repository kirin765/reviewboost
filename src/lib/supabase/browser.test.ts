import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createBrowserClient: vi.fn(),
  getSupabaseUrl: vi.fn(),
  getSupabaseAnonKey: vi.fn()
}));

vi.mock("@supabase/ssr", () => ({
  createBrowserClient: mocks.createBrowserClient
}));

vi.mock("@/lib/supabase/keys", () => ({
  getSupabaseUrl: mocks.getSupabaseUrl,
  getSupabaseAnonKey: mocks.getSupabaseAnonKey
}));

describe("createSupabaseBrowserClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mocks.getSupabaseUrl.mockReturnValue("https://project.supabase.co");
    mocks.getSupabaseAnonKey.mockReturnValue("anon-key");
    mocks.createBrowserClient.mockReturnValue({ auth: {} });
  });

  it("reuses the SSR browser client so auth redirects stay on the PKCE flow", async () => {
    const { createSupabaseBrowserClient } = await import("./browser");

    const first = createSupabaseBrowserClient();
    const second = createSupabaseBrowserClient();

    expect(mocks.createBrowserClient).toHaveBeenCalledTimes(1);
    expect(mocks.createBrowserClient).toHaveBeenCalledWith("https://project.supabase.co", "anon-key");
    expect(second).toBe(first);
  });
});
