import { createHmac } from "node:crypto";
import { ApiError } from "@/lib/api_error";

const COUPANG_API_BASE_URL = "https://api-gateway.coupang.com";
const SELLER_PRODUCTS_PATH = "/v2/providers/seller_api/apis/api/v1/marketplace/seller-products";
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 30000;
const DEFAULT_MARKET = "KR";
const DEFAULT_MAX_PER_PAGE = 10;
const MAX_MAX_PER_PAGE = 100;

const ALLOWED_STATUSES = new Set([
  "IN_REVIEW",
  "SAVED",
  "APPROVING",
  "APPROVED",
  "PARTIAL_APPROVED",
  "DENIED",
  "DELETED"
] as const);

type CoupangOpenApiConfig = {
  accessKey: string;
  secretKey: string;
  vendorId: string;
  market: string;
  timeoutMs: number;
};

export type CoupangSellerProductStatus =
  | "IN_REVIEW"
  | "SAVED"
  | "APPROVING"
  | "APPROVED"
  | "PARTIAL_APPROVED"
  | "DENIED"
  | "DELETED";

export type CoupangSellerProductsQuery = {
  nextToken?: string;
  maxPerPage?: number;
  sellerProductId?: number;
  sellerProductName?: string;
  status?: CoupangSellerProductStatus;
  manufacture?: string;
  createdAt?: string;
};

export type CoupangSellerProduct = {
  sellerProductId: number;
  sellerProductName: string;
  displayCategoryCode: number | null;
  categoryId: number | null;
  productId: number | null;
  vendorId: string;
  mdId?: string | null;
  mdName?: string | null;
  saleStartedAt: string | null;
  saleEndedAt: string | null;
  brand: string | null;
  statusName: string | null;
  createdAt: string | null;
};

export type CoupangSellerProductsResponse = {
  code: string;
  message: string;
  nextToken: string;
  data: CoupangSellerProduct[];
};

function clean(value: string | undefined) {
  return String(value ?? "").trim();
}

function parseTimeout(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(parsed, MAX_TIMEOUT_MS);
}

function normalizeCredentials(credentials: Pick<CoupangOpenApiConfig, "accessKey" | "secretKey" | "vendorId"> & { market?: string; timeoutMs?: number }) {
  const accessKey = clean(credentials.accessKey);
  const secretKey = clean(credentials.secretKey);
  const vendorId = clean(credentials.vendorId);
  const market = clean(credentials.market).toUpperCase() || DEFAULT_MARKET;
  const timeoutMs = credentials.timeoutMs ?? parseTimeout(process.env.COUPANG_OPENAPI_TIMEOUT_MS);

  if (!accessKey || !secretKey || !vendorId) {
    throw new ApiError(503, "COUPANG_OPENAPI_NOT_CONFIGURED", "쿠팡 Open API 자격증명이 설정되지 않았습니다.");
  }

  if (!["KR", "TW"].includes(market)) {
    throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "쿠팡 Open API 시장 설정이 올바르지 않습니다.");
  }

  return { accessKey, secretKey, vendorId, market, timeoutMs };
}

function normalizeQuery(input: CoupangSellerProductsQuery, config: Pick<CoupangOpenApiConfig, "vendorId">): URLSearchParams {
  const params = new URLSearchParams();
  params.set("vendorId", config.vendorId);

  const nextToken = clean(input.nextToken);
  if (nextToken && nextToken !== "1") {
    const parsed = Number.parseInt(nextToken, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "nextToken 값이 올바르지 않습니다.");
    }
    params.set("nextToken", String(parsed));
  }

  const maxPerPage = input.maxPerPage ?? DEFAULT_MAX_PER_PAGE;
  if (!Number.isFinite(maxPerPage) || maxPerPage <= 0 || maxPerPage > MAX_MAX_PER_PAGE) {
    throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "maxPerPage는 1 이상 100 이하여야 합니다.");
  }
  params.set("maxPerPage", String(Math.trunc(maxPerPage)));

  if (input.sellerProductId !== undefined) {
    if (!Number.isFinite(input.sellerProductId) || input.sellerProductId <= 0) {
      throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "sellerProductId 값이 올바르지 않습니다.");
    }
    params.set("sellerProductId", String(Math.trunc(input.sellerProductId)));
  }

  const sellerProductName = clean(input.sellerProductName);
  if (sellerProductName) {
    if (sellerProductName.length > 20) {
      throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "sellerProductName은 20자 이하여야 합니다.");
    }
    params.set("sellerProductName", sellerProductName);
  }

  if (input.status) {
    if (!ALLOWED_STATUSES.has(input.status)) {
      throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "status 값이 올바르지 않습니다.");
    }
    params.set("status", input.status);
  }

  const manufacture = clean(input.manufacture);
  if (manufacture) params.set("manufacture", manufacture);

  const createdAt = clean(input.createdAt);
  if (createdAt) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(createdAt)) {
      throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "createdAt은 yyyy-MM-dd 형식이어야 합니다.");
    }
    params.set("createdAt", createdAt);
  }

  return params;
}

function buildSignedDate(now = new Date()) {
  return now.toISOString().split(".")[0]!.replace(/[-:]/g, "").slice(2) + "Z";
}

function buildAuthorizationHeader(
  config: Pick<CoupangOpenApiConfig, "accessKey" | "secretKey">,
  method: string,
  path: string,
  queryString: string,
  now = new Date()
) {
  const signedDate = buildSignedDate(now);
  const requestData = `${signedDate}${method.toUpperCase()}${path}${queryString}`;
  const signature = createHmac("sha256", config.secretKey).update(requestData, "utf8").digest("hex");

  return `CEA algorithm=HmacSHA256, access-key=${config.accessKey}, signed-date=${signedDate}, signature=${signature}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeProduct(item: unknown): CoupangSellerProduct {
  const source = isRecord(item) ? item : {};
  return {
    sellerProductId: Number(source.sellerProductId ?? 0),
    sellerProductName: String(source.sellerProductName ?? ""),
    displayCategoryCode: source.displayCategoryCode == null ? null : Number(source.displayCategoryCode),
    categoryId: source.categoryId == null ? null : Number(source.categoryId),
    productId: source.productId == null ? null : Number(source.productId),
    vendorId: String(source.vendorId ?? ""),
    mdId: source.mdId == null ? null : String(source.mdId),
    mdName: source.mdName == null ? null : String(source.mdName),
    saleStartedAt: source.saleStartedAt == null ? null : String(source.saleStartedAt),
    saleEndedAt: source.saleEndedAt == null ? null : String(source.saleEndedAt),
    brand: source.brand == null ? null : String(source.brand),
    statusName: source.statusName == null ? null : String(source.statusName),
    createdAt: source.createdAt == null ? null : String(source.createdAt)
  };
}

function normalizeResponse(payload: unknown): CoupangSellerProductsResponse {
  if (!isRecord(payload)) {
    throw new ApiError(502, "COUPANG_OPENAPI_INVALID_RESPONSE", "쿠팡 Open API 응답 형식이 올바르지 않습니다.");
  }

  const data = Array.isArray(payload.data) ? payload.data.map(normalizeProduct) : [];
  return {
    code: String(payload.code ?? ""),
    message: String(payload.message ?? ""),
    nextToken: String(payload.nextToken ?? ""),
    data
  };
}

export async function getCoupangSellerProducts(
  credentials: Pick<CoupangOpenApiConfig, "accessKey" | "secretKey" | "vendorId"> & { market?: string; timeoutMs?: number },
  query: CoupangSellerProductsQuery
): Promise<CoupangSellerProductsResponse> {
  const config = normalizeCredentials(credentials);
  const params = normalizeQuery(query, config);
  const queryString = params.toString();
  const endpoint = new URL(`${SELLER_PRODUCTS_PATH}?${queryString}`, COUPANG_API_BASE_URL);
  const authorization = buildAuthorizationHeader(config, "GET", SELLER_PRODUCTS_PATH, queryString);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "GET",
      headers: {
        Authorization: authorization,
        "X-Requested-By": config.vendorId,
        "X-MARKET": config.market,
        Accept: "application/json"
      },
      cache: "no-store",
      signal: controller.signal
    });
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(502, "COUPANG_OPENAPI_UPSTREAM_ERROR", "쿠팡 Open API 응답 시간이 초과되었습니다.");
    }
    throw new ApiError(502, "COUPANG_OPENAPI_UPSTREAM_ERROR", "쿠팡 Open API 호출에 실패했습니다.");
  }
  clearTimeout(timeout);

  if (response.status === 401 || response.status === 403) {
    const details = await response.text().catch(() => "");
    throw new ApiError(401, "COUPANG_OPENAPI_UNAUTHORIZED", "쿠팡 Open API 인증에 실패했습니다.", {
      details: details.slice(0, 500) || `status=${response.status}`
    });
  }

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new ApiError(502, "COUPANG_OPENAPI_UPSTREAM_ERROR", "쿠팡 Open API 상품 목록 조회에 실패했습니다.", {
      details: details.slice(0, 500) || `status=${response.status}`
    });
  }

  const payload = await response.json().catch(() => null);
  return normalizeResponse(payload);
}

export const __testables = {
  buildSignedDate,
  buildAuthorizationHeader,
  normalizeQuery,
  normalizeCredentials
};
