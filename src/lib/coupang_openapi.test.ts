import { describe, expect, it } from "vitest";
import { __testables, getCoupangSellerProducts } from "@/lib/coupang_openapi";

describe("coupang_openapi", () => {
  it("builds authorization header in coupang format", () => {
    const auth = __testables.buildAuthorizationHeader(
      { accessKey: "access", secretKey: "secret" },
      "GET",
      "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products",
      "vendorId=A00012345&maxPerPage=10",
      new Date("2026-04-05T12:34:56.000Z")
    );

    expect(auth).toContain("CEA algorithm=HmacSHA256");
    expect(auth).toContain("access-key=access");
    expect(auth).toContain("signed-date=260405T123456Z");
    expect(auth).toContain("signature=");
  });

  it("throws when openapi env is missing", async () => {
    await expect(getCoupangSellerProducts({ accessKey: "", secretKey: "", vendorId: "" }, {})).rejects.toMatchObject({
      code: "COUPANG_OPENAPI_NOT_CONFIGURED"
    });
  });

  it("validates sellerProductName length", () => {
    expect(() =>
      __testables.normalizeQuery({ sellerProductName: "123456789012345678901" }, {
        vendorId: "A00012345"
      })
    ).toThrowError(/20자 이하/);
  });
});
