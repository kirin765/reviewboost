import { describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({
  getCoupangSellerProducts: vi.fn(),
  logApiError: vi.fn(),
  createSupabaseServerActionClient: vi.fn(),
  getCoupangCredentials: vi.fn()
}));

vi.mock("@/lib/coupang_openapi", () => ({
  getCoupangSellerProducts: mocks.getCoupangSellerProducts
}));

vi.mock("@/lib/api_log", () => ({
  logApiError: mocks.logApiError
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerActionClient: mocks.createSupabaseServerActionClient
}));

vi.mock("@/lib/coupang_credentials", () => ({
  getCoupangCredentials: mocks.getCoupangCredentials
}));

describe("GET /api/coupang/products", () => {
  it("returns product list on success", async () => {
    mocks.createSupabaseServerActionClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) }
    });
    mocks.getCoupangCredentials.mockResolvedValueOnce({
      vendorId: "A0001",
      accessKey: "access",
      secretKey: "secret",
      market: "KR"
    });

    mocks.getCoupangSellerProducts.mockResolvedValueOnce({
      code: "SUCCESS",
      message: "",
      nextToken: "2",
      data: [{ sellerProductId: 1, sellerProductName: "테스트 상품", vendorId: "A0001" }]
    });

    const req = new Request("https://reviewboost.app/api/coupang/products?maxPerPage=20&sellerProductName=%ED%85%8C%EC%8A%A4%ED%8A%B8");
    const res = await GET(req);
    const body = (await res.json()) as { nextToken: string; data: Array<{ sellerProductId: number }> };

    expect(res.status).toBe(200);
    expect(body.nextToken).toBe("2");
    expect(body.data[0]?.sellerProductId).toBe(1);
    expect(mocks.getCoupangSellerProducts).toHaveBeenCalledWith(
      expect.objectContaining({
        vendorId: "A0001",
        accessKey: "access"
      }),
      expect.objectContaining({
        maxPerPage: 20,
        sellerProductName: "테스트"
      })
    );
  });

  it("returns 400 on invalid integer query", async () => {
    mocks.createSupabaseServerActionClient.mockResolvedValueOnce({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-1" } } }) }
    });

    const req = new Request("https://reviewboost.app/api/coupang/products?maxPerPage=abc");
    const res = await GET(req);
    const body = (await res.json()) as { error: { code: string } };

    expect(res.status).toBe(400);
    expect(body.error.code).toBe("COUPANG_OPENAPI_INVALID_REQUEST");
  });
});
