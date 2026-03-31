import { describe, expect, it, vi } from "vitest";

const { mockRedirect } = vi.hoisted(() => ({
  mockRedirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  })
}));

vi.mock("next/navigation", () => ({
  redirect: mockRedirect
}));

import HistoryPage from "./page";

describe("/dashboard/history page", () => {
  it("redirects the old history route to dashboard home", async () => {
    await expect(HistoryPage()).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(mockRedirect).toHaveBeenCalledWith("/dashboard");
  });
});
