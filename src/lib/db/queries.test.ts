import { beforeEach, describe, it, expect, vi } from "vitest";
import { buildAnalysisListQueryFilter, recordFunnelEvent } from "./queries";
import { funnelEvents } from "./schema";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("./index", () => ({ getDb: mocks.getDb }));

describe("buildAnalysisListQueryFilter", () => {
  it("always includes the userId in the filter description", () => {
    const f = buildAnalysisListQueryFilter("user_abc");
    expect(f.userId).toBe("user_abc");
  });

  it("rejects empty userId", () => {
    expect(() => buildAnalysisListQueryFilter("")).toThrow();
  });
});

describe("recordFunnelEvent", () => {
  const onConflictDoNothing = vi.fn();
  const values = vi.fn(() => ({ onConflictDoNothing }));
  const insert = vi.fn(() => ({ values }));

  beforeEach(() => {
    vi.clearAllMocks();
    onConflictDoNothing.mockResolvedValue([]);
    mocks.getDb.mockReturnValue({ insert });
  });

  it("inserts with the dedupe key and ignores conflicts on the unique index", async () => {
    await recordFunnelEvent("extension_payment_completed", "user_1", { event_id: "evt_1" }, "txn_1");
    expect(values).toHaveBeenCalledWith({
      name: "extension_payment_completed",
      userId: "user_1",
      meta: { event_id: "evt_1" },
      dedupeKey: "txn_1"
    });
    expect(onConflictDoNothing).toHaveBeenCalledWith({ target: funnelEvents.dedupeKey });
  });

  it("inserts a null dedupe key when none is passed (limit_hit/checkout)", async () => {
    await recordFunnelEvent("extension_limit_hit", null, { source: "popup" });
    expect(values).toHaveBeenCalledWith({
      name: "extension_limit_hit",
      userId: null,
      meta: { source: "popup" },
      dedupeKey: null
    });
  });

  it("is a silent no-op when the insert fails", async () => {
    onConflictDoNothing.mockRejectedValue(new Error("duplicate key"));
    await expect(
      recordFunnelEvent("extension_payment_completed", "user_1", null, "txn_1")
    ).resolves.toBeUndefined();
  });

  it("is a silent no-op when the DB is unconfigured", async () => {
    mocks.getDb.mockReturnValue(null);
    await expect(recordFunnelEvent("extension_limit_hit")).resolves.toBeUndefined();
    expect(insert).not.toHaveBeenCalled();
  });
});
