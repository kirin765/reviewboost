import { createSupabaseServerActionClient } from "@/lib/supabase/server";
import { appBaseUrl, isPaddleConfigured, paddleEnv, paddlePriceIdForPlan, paddleRequest } from "@/lib/paddle";
import { findPaddleCustomerIdByUserId } from "@/lib/billing";
import { logApiError } from "@/lib/api_log";
import { csrfErrorResponse, isSameOriginRequest } from "@/lib/csrf";

type Body = {
  plan?: "basic" | "pro";
};

type CheckoutErrorCode =
  | "paddle_not_configured"
  | "missing_price_id"
  | "invalid_base_url"
  | "private_or_local_base_url"
  | "invalid_checkout_urls"
  | "paddle_request_failed"
  | "checkout_error";

type CheckoutErrorResponse = {
  error: string;
  code?: CheckoutErrorCode;
  details?: string;
  debug?: {
    env: string;
    paddleEnv: "sandbox" | "live" | "unknown";
    baseUrl: string;
    plan: "basic" | "pro";
    priceId: string;
    note?: string;
  };
};

type PaddleCheckoutResponse = {
  checkout?: { url?: string };
  data?: { checkout?: { url?: string } };
  url?: string;
};

const CHECKOUT_ROUTE = "/api/billing/checkout";

function normalizeCheckoutCode(details?: string, fallback?: string): CheckoutErrorCode {
  const knownCodes: CheckoutErrorCode[] = [
    "paddle_not_configured",
    "missing_price_id",
    "invalid_base_url",
    "private_or_local_base_url",
    "invalid_checkout_urls",
    "paddle_request_failed",
    "checkout_error"
  ];

  if (typeof fallback === "string" && knownCodes.includes(fallback as CheckoutErrorCode)) {
    return fallback as CheckoutErrorCode;
  }

  const normalized = typeof details === "string" ? details.toLowerCase() : "";
  if (normalized.includes("url called is invalid") || normalized.includes("invalid checkout url")) {
    return "invalid_checkout_urls";
  }
  if (normalized.includes("private") || normalized.includes("localhost") || normalized.includes("local")) {
    return "private_or_local_base_url";
  }
  if (normalized.includes("callback") || normalized.includes("https")) {
    return "invalid_base_url";
  }

  return "checkout_error";
}

function isPrivateOrLocalHost(hostname: string): boolean {
  if (!hostname) return false;
  if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  return (
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    hostname.startsWith("172.") ||
    hostname.startsWith("100.")
  );
}

function buildCheckoutUrl(baseUrl: string, plan: "basic" | "pro", type: "success" | "cancel") {
  const safePlan = type === "success" ? "success" : "cancel";
  const suffix = plan === "pro" ? "pro" : "basic";
  const parsedBase = new URL(baseUrl);
  const rootPath = parsedBase.pathname === "/" ? "" : parsedBase.pathname.replace(/\/$/, "");
  const url = new URL(`${rootPath}/pricing`, parsedBase.origin);
  url.searchParams.set("billing", safePlan);
  url.searchParams.set("plan", suffix);
  return url.toString();
}

function isPublicHttpsBaseUrl(raw: string): { ok: boolean; reason?: CheckoutErrorResponse } {
  try {
    const parsed = new URL(raw);
    if (parsed.protocol !== "https:") {
      return {
        ok: false,
        reason: {
          error: "결제 콜백 URL이 HTTPS가 아닙니다.",
          code: "invalid_base_url",
          details: "Paddle 결제 URL은 HTTPS 도메인만 허용합니다."
        }
      };
    }

    if (isPrivateOrLocalHost(parsed.hostname)) {
      return {
        ok: false,
        reason: {
          error: "APP_BASE_URL은 로컬/사설 네트워크 주소에서는 결제 생성이 제한됩니다.",
          code: "private_or_local_base_url",
          details: "Paddle 테스트/결제는 외부에서 접속 가능한 공개 HTTPS 도메인(APP_BASE_URL)을 사용하세요."
        }
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      reason: {
        error: "결제 콜백 URL 형식이 유효하지 않습니다.",
        code: "invalid_base_url",
        details: "APP_BASE_URL 또는 요청 Host가 유효한 URL 형식이 아닙니다."
      }
    };
  }
}

function errorResponse(data: CheckoutErrorResponse, status: number) {
  const payload: Record<string, unknown> = { ...data };
  if (process.env.NODE_ENV === "production") {
    delete payload.debug;
  }
  return Response.json(payload, { status });
}

export const runtime = "nodejs";

export async function POST(req: Request) {
  const debug = {
    env: process.env.NODE_ENV ?? "development",
    paddleEnv: "unknown" as "sandbox" | "live",
    baseUrl: "unknown",
    plan: "basic" as "basic" | "pro",
    priceId: ""
  };

  if (!isSameOriginRequest(req)) return csrfErrorResponse();

  const logCheckoutError = async (status: number, payload: CheckoutErrorResponse) => {
    await logApiError({
      route: CHECKOUT_ROUTE,
      method: req.method,
      status,
      code: payload.code ?? "checkout_error",
      message: payload.error,
      details: payload.details,
      request: req,
      extra: {
        debug,
        ...payload.debug,
        note: payload.debug?.note
      }
    });
  };

  try {
    debug.paddleEnv = paddleEnv();
    const supabase = await createSupabaseServerActionClient();
    const { data } = await supabase.auth.getUser();
    const user = data.user;

    if (!user?.id || !user.email) {
      const payload = {
        error: "로그인이 필요합니다.",
        code: "checkout_error" as CheckoutErrorCode
      };
      await logCheckoutError(401, payload);
      return Response.json({ error: payload.error, code: payload.code }, { status: 401 });
    }

    if (!isPaddleConfigured()) {
      const payload = {
        error: "결제 설정이 아직 완료되지 않았습니다.",
        code: "paddle_not_configured" as CheckoutErrorCode,
        debug: { ...debug, baseUrl: "unknown", priceId: "", note: "environment not fully configured" }
      };
      await logCheckoutError(503, payload);
      return errorResponse(payload, 503);
    }

    let body: Body = {};
    try {
      body = (await req.json()) as Body;
    } catch {
      // empty/non-json body defaults to basic
    }

    const plan = body.plan === "pro" ? "pro" : "basic";
    debug.plan = plan;

    let priceId: string;
    try {
      priceId = paddlePriceIdForPlan(plan);
    } catch {
      const payload = {
        error: "요금제 가격 ID가 설정되지 않았습니다.",
        code: "missing_price_id" as CheckoutErrorCode,
        debug
      };
      await logCheckoutError(500, payload);
      return errorResponse(payload, 500);
    }
    debug.priceId = priceId;

    const baseUrl = appBaseUrl(req);
    const baseHostname = new URL(baseUrl).hostname;
    debug.baseUrl = baseUrl;

    if (isPrivateOrLocalHost(baseHostname)) {
      const payload = {
        error: "APP_BASE_URL은 로컬/사설 네트워크 주소에서는 결제 생성이 제한됩니다.",
        code: "private_or_local_base_url" as CheckoutErrorCode,
        details: "Paddle 테스트/결제는 외부에서 접속 가능한 공개 HTTPS 도메인(APP_BASE_URL)을 사용하세요.",
        debug
      };
      await logCheckoutError(500, payload);
      return errorResponse(payload, 500);
    }

    const urlCheck = isPublicHttpsBaseUrl(baseUrl);
    if (!urlCheck.ok) {
      const payload = {
        ...urlCheck.reason!,
        debug
      };
      await logCheckoutError(500, payload);
      return errorResponse(payload, 500);
    }

    const checkoutUrl = buildCheckoutUrl(baseUrl, plan, "success");

    try {
      new URL(checkoutUrl);
    } catch {
      const payload = {
        error: "결제 콜백 URL을 생성하지 못했습니다.",
        code: "invalid_checkout_urls" as CheckoutErrorCode,
        details: "결제 성공/취소 URL이 유효하지 않습니다.",
        debug
      };
      await logCheckoutError(500, payload);
      return errorResponse(payload, 500);
    }

    const knownCustomerId = await findPaddleCustomerIdByUserId(user.id);

    const checkout = await paddleRequest<PaddleCheckoutResponse>("/transactions", {
      method: "POST",
      body: {
        items: [{ price_id: priceId, quantity: 1 }],
        custom_data: {
          user_id: user.id,
          plan_tier: plan
        },
        collection_mode: "automatic",
        checkout: {
          url: checkoutUrl
        },
        ...(knownCustomerId ? { customer_id: knownCustomerId } : {})
      }
    });

    const url = String(
      checkout?.checkout?.url
        ?? checkout?.data?.checkout?.url
        ?? checkout?.url
        ?? ""
    ).trim();
    if (!url) {
      const payload = {
        error: "결제 세션 생성에 실패했습니다.",
        code: "checkout_error" as CheckoutErrorCode
      };
      await logCheckoutError(500, payload);
      return Response.json({ error: payload.error, code: payload.code }, { status: 500 });
    }

    return Response.json({ url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "unknown");
    const details = error instanceof Error && "info" in error
      ? (() => {
          const err = error as Error & { info?: { message?: string; code?: string; detail?: string; rawText?: string } };
          return err.info?.detail || err.info?.message || message;
        })()
      : message;
    const code = error instanceof Error && "info" in error
      ? (error as Error & { info?: { code?: string; detail?: string } }).info?.code
      : undefined;
    const mappedCode = normalizeCheckoutCode(
      typeof details === "string" ? details : undefined,
      typeof code === "string" ? code : undefined
    );

    console.error("Checkout error:", error);
    await logCheckoutError(500, {
      error: "결제 세션 생성 중 오류가 발생했습니다.",
      code: mappedCode,
      details,
      debug
    });
    return errorResponse(
      {
        error: "결제 세션 생성 중 오류가 발생했습니다.",
        code: mappedCode,
        details,
        debug
      },
      500
    );
  }
}
