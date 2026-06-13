import { ApiError } from "@/lib/api_error";

const DEFAULT_DOWNLOAD_PATH = "/api/coupang/reviews/csv"; // crawler-server endpoint
const DEFAULT_TIMEOUT_MS = 180000;
const MAX_TIMEOUT_MS = 180000;
const DEFAULT_REVIEW_LIMIT = 100;

const COUPANG_HOST_ALLOWLIST = new Set(["www.coupang.com", "m.coupang.com", "coupang.com"]);
const PRODUCT_PATH_HINTS = ["/vp/products/", "/products/"];

type DownloadInput = {
  productUrl: string;
};

type CrawlerConfig = {
  baseUrl: string;
  downloadPath: string;
  timeoutMs: number;
  reviewLimit: number;
  authHeaderName: string | null;
  authHeaderValue: string | null;
  authToken: string | null;
  productUrlField: string;
  extraBody: Record<string, unknown>;
};

export type CrawlerDownloadResult = {
  csvBuffer: ArrayBuffer;
  contentType: string;
  filename: string;
};

function sanitizeHeaderValue(value: string) {
  return value.replace(/[\r\n]/g, " ").trim();
}

function parseTimeout(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(parsed, MAX_TIMEOUT_MS);
}

function parseReviewLimit(value: string | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_REVIEW_LIMIT;
  return Math.min(parsed, 300);
}

function loadCrawlerConfig(): CrawlerConfig {
  const baseUrl = String(process.env.COUPANG_CRAWLER_BASE_URL ?? "").trim();
  if (!baseUrl) {
    throw new ApiError(503, "CRAWLER_NOT_CONFIGURED", "크롤러 서버 URL이 설정되지 않았습니다.");
  }

  try {
    const parsed = new URL(baseUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("invalid protocol");
    }
  } catch {
    throw new ApiError(503, "CRAWLER_NOT_CONFIGURED", "크롤러 서버 URL 설정이 올바르지 않습니다.");
  }

  const downloadPath = String(process.env.COUPANG_CRAWLER_DOWNLOAD_PATH ?? DEFAULT_DOWNLOAD_PATH).trim() || DEFAULT_DOWNLOAD_PATH;
  if (!downloadPath.startsWith("/")) {
    throw new ApiError(503, "CRAWLER_NOT_CONFIGURED", "크롤러 엔드포인트 경로 설정이 올바르지 않습니다.");
  }
  const timeoutMs = parseTimeout(process.env.COUPANG_CRAWLER_TIMEOUT_MS);
  const reviewLimit = parseReviewLimit(process.env.COUPANG_CRAWLER_LIMIT);
  const authHeaderName = String(process.env.COUPANG_CRAWLER_AUTH_HEADER_NAME ?? "").trim() || null;
  const authHeaderValue = String(process.env.COUPANG_CRAWLER_AUTH_HEADER_VALUE ?? "").trim() || null;
  const authToken = String(process.env.COUPANG_CRAWLER_AUTH_TOKEN ?? "").trim() || null;
  const productUrlField = String(process.env.COUPANG_CRAWLER_PRODUCT_URL_FIELD ?? "url").trim() || "url";
  let extraBody: Record<string, unknown> = {};
  const extraBodyRaw = String(process.env.COUPANG_CRAWLER_EXTRA_BODY_JSON ?? "").trim();
  if (extraBodyRaw) {
    try {
      const parsed = JSON.parse(extraBodyRaw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        extraBody = parsed as Record<string, unknown>;
      }
    } catch {
      throw new ApiError(503, "CRAWLER_NOT_CONFIGURED", "크롤러 추가 요청 본문 설정이 올바르지 않습니다.");
    }
  }

  return { baseUrl, downloadPath, timeoutMs, reviewLimit, authHeaderName, authHeaderValue, authToken, productUrlField, extraBody };
}

function normalizeCoupangProductUrl(raw: string) {
  const text = String(raw ?? "").trim();
  if (!text) {
    throw new ApiError(400, "CRAWLER_INVALID_PRODUCT_URL", "상품 URL을 입력해주세요.");
  }

  let url: URL;
  try {
    url = new URL(text);
  } catch {
    throw new ApiError(400, "CRAWLER_INVALID_PRODUCT_URL", "올바른 URL 형식이 아닙니다.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new ApiError(400, "CRAWLER_INVALID_PRODUCT_URL", "http 또는 https URL만 지원합니다.");
  }

  const host = url.hostname.toLowerCase();
  if (!COUPANG_HOST_ALLOWLIST.has(host)) {
    throw new ApiError(400, "CRAWLER_INVALID_PRODUCT_URL", "현재 지원되는 스토어 상품 URL만 다운로드할 수 있습니다.");
  }

  const matchesPath = PRODUCT_PATH_HINTS.some((segment) => url.pathname.includes(segment));
  if (!matchesPath) {
    throw new ApiError(400, "CRAWLER_INVALID_PRODUCT_URL", "상품 상세 URL을 입력해주세요.");
  }

  url.hash = "";
  return url.toString();
}

function resolveFilename(contentDisposition: string | null) {
  if (!contentDisposition) return null;
  const filenameStar = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(contentDisposition)?.[1];
  if (filenameStar) {
    try {
      return decodeURIComponent(filenameStar);
    } catch {
      return filenameStar;
    }
  }

  const filename = /filename\s*=\s*("?)([^";]+)\1/i.exec(contentDisposition)?.[2];
  return filename ?? null;
}

function safeFilename(value: string | null) {
  const fallback = `store-reviews-${Date.now()}.csv`;
  if (!value) return fallback;
  const cleaned = value
    .replace(/[\r\n\t]+/g, " ")
    .replace(/[^\x20-\x7E가-힣]/g, "")
    .replace(/[/\\?%*:|"<>]/g, "-")
    .trim();
  if (!cleaned) return fallback;
  return cleaned.toLowerCase().endsWith(".csv") ? cleaned : `${cleaned}.csv`;
}

export async function downloadCoupangCsv(input: DownloadInput): Promise<CrawlerDownloadResult> {
  const config = loadCrawlerConfig();
  const productUrl = normalizeCoupangProductUrl(input.productUrl);
  const endpoint = new URL(config.downloadPath, config.baseUrl);

  const headers = new Headers({ "content-type": "application/json", accept: "text/csv,application/octet-stream,*/*" });
  if (config.authHeaderName && config.authHeaderValue) {
    headers.set(config.authHeaderName, sanitizeHeaderValue(config.authHeaderValue));
  }
  if (config.authToken) {
    headers.set("X-ReviewBoost-Token", sanitizeHeaderValue(config.authToken));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  let response: Response;
  try {
    const body: Record<string, unknown> = {
      limit: config.reviewLimit,
      ...config.extraBody,
      [config.productUrlField]: productUrl
    };
    response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error: unknown) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(504, "CRAWLER_UPSTREAM_TIMEOUT", "크롤러 응답 시간이 초과되었습니다.");
    }
    throw new ApiError(502, "CRAWLER_UPSTREAM_ERROR", "크롤러 서버 호출에 실패했습니다.");
  }
  clearTimeout(timeout);

  if (!response.ok) {
    let details = "";
    try {
      details = await response.text();
    } catch {
      details = "";
    }
    throw new ApiError(502, "CRAWLER_UPSTREAM_ERROR", "크롤러 서버에서 CSV 생성에 실패했습니다.", {
      details: details.slice(0, 500) || `status=${response.status}`
    });
  }

  const csvBuffer = await response.arrayBuffer();
  if (csvBuffer.byteLength === 0) {
    throw new ApiError(502, "CRAWLER_INVALID_RESPONSE", "크롤러 응답이 비어 있습니다.");
  }

  const rawType = String(response.headers.get("content-type") ?? "").toLowerCase().replace(/[\r\n\t]+/g, " ").trim();
  const contentType = rawType.includes("csv") ? rawType : "text/csv; charset=utf-8";
  const filename = safeFilename(resolveFilename(response.headers.get("content-disposition")));

  return {
    csvBuffer,
    contentType,
    filename
  };
}
