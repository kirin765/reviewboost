import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createSupportInquiry: vi.fn(),
  notifySupportInquiry: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db/queries", () => ({ createSupportInquiry: mocks.createSupportInquiry }));
vi.mock("@/lib/support_notify", () => ({ notifySupportInquiry: mocks.notifySupportInquiry }));

const ORIGIN = "https://reviewboost.co.kr";

function supportRequest(body: unknown, opts?: { origin?: string | null }): Request {
  const headers: Record<string, string> = { "content-type": "application/json" };
  const origin = opts?.origin === undefined ? ORIGIN : opts.origin;
  if (origin) headers.origin = origin;
  return new Request(`${ORIGIN}/api/support`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
}

const VALID = { email: "buyer@example.com", category: "billing", message: "환불은 어떻게 하나요?" };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: null });
  mocks.createSupportInquiry.mockResolvedValue(true);
  mocks.notifySupportInquiry.mockResolvedValue(true);
});

describe("POST /api/support", () => {
  it("stores and notifies a valid inquiry, returns 201", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_1" });
    const res = await POST(supportRequest(VALID));
    expect(res.status).toBe(201);
    expect(mocks.createSupportInquiry).toHaveBeenCalledWith({ userId: "user_1", ...VALID });
    expect(mocks.notifySupportInquiry).toHaveBeenCalledWith({ userId: "user_1", ...VALID });
  });

  it("accepts anonymous inquiries with a null userId", async () => {
    const res = await POST(supportRequest(VALID));
    expect(res.status).toBe(201);
    expect(mocks.createSupportInquiry).toHaveBeenCalledWith({ userId: null, ...VALID });
  });

  it("rejects cross-origin requests with 403", async () => {
    const res = await POST(supportRequest(VALID, { origin: "https://evil.example" }));
    expect(res.status).toBe(403);
    expect(mocks.createSupportInquiry).not.toHaveBeenCalled();
  });

  it("rejects an invalid email, category, or short message with 400", async () => {
    for (const body of [
      { ...VALID, email: "not-an-email" },
      { ...VALID, category: "unknown" },
      { ...VALID, message: "짧다" }
    ]) {
      const res = await POST(supportRequest(body));
      expect(res.status).toBe(400);
    }
    expect(mocks.createSupportInquiry).not.toHaveBeenCalled();
  });

  it("succeeds when only one of store/notify works", async () => {
    mocks.createSupportInquiry.mockResolvedValue(false);
    const res = await POST(supportRequest(VALID));
    expect(res.status).toBe(201);
  });

  it("returns 503 when both store and notify fail", async () => {
    mocks.createSupportInquiry.mockResolvedValue(false);
    mocks.notifySupportInquiry.mockResolvedValue(false);
    const res = await POST(supportRequest(VALID));
    expect(res.status).toBe(503);
  });
});
