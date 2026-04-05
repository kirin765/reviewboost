import { NextResponse } from "next/server";
import { ApiError, apiErrorResponse } from "@/lib/api_error";
import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { getErrorMessage } from "@/types/common";
import { getCoupangCredentialSummary, upsertCoupangCredentials } from "@/lib/coupang_credentials";
import { logApiError } from "@/lib/api_log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RequestBody = {
  vendorId?: string;
  accessKey?: string;
  secretKey?: string;
  market?: string;
};

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
    const summary = await getCoupangCredentialSummary(user.id);
    return NextResponse.json(summary, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (error: unknown) {
    if (error instanceof ApiError) return apiErrorResponse(error);
    await logApiError({
      route: "/api/integrations/coupang",
      method: "GET",
      status: 500,
      code: "INTERNAL_ERROR",
      message: "쿠팡 연동 정보 조회 중 오류가 발생했습니다.",
      details: getErrorMessage(error),
      request: req,
      error
    });
    return apiErrorResponse(new ApiError(500, "INTERNAL_ERROR", "쿠팡 연동 정보 조회 중 오류가 발생했습니다."));
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    const body = (await req.json()) as RequestBody;
    await upsertCoupangCredentials(user.id, {
      vendorId: String(body.vendorId ?? ""),
      accessKey: String(body.accessKey ?? ""),
      secretKey: String(body.secretKey ?? ""),
      market: String(body.market ?? "KR") as "KR" | "TW"
    });
    const summary = await getCoupangCredentialSummary(user.id);
    return NextResponse.json(summary, { status: 200, headers: { "cache-control": "no-store" } });
  } catch (error: unknown) {
    if (error instanceof ApiError) return apiErrorResponse(error);
    await logApiError({
      route: "/api/integrations/coupang",
      method: "POST",
      status: 500,
      code: "INTERNAL_ERROR",
      message: "쿠팡 연동 정보 저장 중 오류가 발생했습니다.",
      details: getErrorMessage(error),
      request: req,
      error
    });
    return apiErrorResponse(new ApiError(500, "INTERNAL_ERROR", "쿠팡 연동 정보 저장 중 오류가 발생했습니다."));
  }
}
