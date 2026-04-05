import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { logApiError } from "@/lib/api_log";
import { getErrorMessage } from "@/types/common";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getCoupangSellerProducts, type CoupangSellerProductsQuery } from "@/lib/coupang_openapi";
import { getCoupangCredentials } from "@/lib/coupang_credentials";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parsePositiveInteger(value: string | null, field: string) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", `${field} 값이 올바르지 않습니다.`);
  }
  return parsed;
}

async function requireUser() {
  const supabase = await createSupabaseServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new ApiError(401, "COUPANG_OPENAPI_UNAUTHORIZED", "로그인이 필요합니다.");
  }

  return user;
}

export async function GET(req: Request) {
  try {
    const user = await requireUser();

    const { searchParams } = new URL(req.url);
    const query: CoupangSellerProductsQuery = {
      nextToken: searchParams.get("nextToken") ?? undefined,
      maxPerPage: parsePositiveInteger(searchParams.get("maxPerPage"), "maxPerPage"),
      sellerProductId: parsePositiveInteger(searchParams.get("sellerProductId"), "sellerProductId"),
      sellerProductName: searchParams.get("sellerProductName") ?? undefined,
      status: (searchParams.get("status") as CoupangSellerProductsQuery["status"]) ?? undefined,
      manufacture: searchParams.get("manufacture") ?? undefined,
      createdAt: searchParams.get("createdAt") ?? undefined
    };

    const credentials = await getCoupangCredentials(user.id);
    const data = await getCoupangSellerProducts(credentials, query);
    return NextResponse.json(data, {
      status: 200,
      headers: { "cache-control": "no-store" }
    });
  } catch (error: unknown) {
    if (error instanceof ApiError) {
      if (error.status >= 500 || error.status === 401) {
        await logApiError({
          route: "/api/coupang/products",
          method: "GET",
          status: error.status,
          code: error.code,
          message: error.message,
          details: error.details ?? getErrorMessage(error),
          request: req,
          error
        });
      }
      return apiErrorResponse(error);
    }

    await logApiError({
      route: "/api/coupang/products",
      method: "GET",
      status: 500,
      code: "INTERNAL_ERROR",
      message: "쿠팡 상품 목록 조회 중 오류가 발생했습니다.",
      details: getErrorMessage(error),
      request: req,
      error
    });
    return apiErrorResponse(new ApiError(500, "INTERNAL_ERROR", "쿠팡 상품 목록 조회 중 오류가 발생했습니다."));
  }
}
