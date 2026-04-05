import { ApiError } from "@/lib/api_error";
import { getSupabaseAdminClient } from "@/lib/supabase_server";
import { encryptString, decryptString } from "@/lib/crypto";

export type CoupangCredentials = {
  vendorId: string;
  accessKey: string;
  secretKey: string;
  market: "KR" | "TW";
};

type CoupangCredentialRow = {
  user_id: string;
  vendor_id_encrypted: string;
  access_key_encrypted: string;
  secret_key_encrypted: string;
  access_key_last4: string | null;
  market: "KR" | "TW";
  created_at?: string;
  updated_at?: string;
};

export type CoupangCredentialSummary = {
  configured: boolean;
  vendorId: string;
  market: "KR" | "TW";
  accessKeyHint: string | null;
  updatedAt: string | null;
};

function clean(value: string | undefined) {
  return String(value ?? "").trim();
}

function requireAdmin() {
  const admin = getSupabaseAdminClient();
  if (!admin) {
    throw new ApiError(503, "INTERNAL_ERROR", "서버 DB 자격증명이 설정되지 않았습니다.");
  }
  return admin;
}

function normalizeMarket(value: string | undefined): "KR" | "TW" {
  const market = clean(value).toUpperCase();
  return market === "TW" ? "TW" : "KR";
}

function validateCredentials(input: CoupangCredentials) {
  const vendorId = clean(input.vendorId);
  const accessKey = clean(input.accessKey);
  const secretKey = clean(input.secretKey);
  const market = normalizeMarket(input.market);

  if (!vendorId) {
    throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "vendorId를 입력해주세요.");
  }
  if (!accessKey) {
    throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "accessKey를 입력해주세요.");
  }
  if (!secretKey) {
    throw new ApiError(400, "COUPANG_OPENAPI_INVALID_REQUEST", "secretKey를 입력해주세요.");
  }

  return { vendorId, accessKey, secretKey, market };
}

function toSummary(row: CoupangCredentialRow | null): CoupangCredentialSummary {
  if (!row) {
    return {
      configured: false,
      vendorId: "",
      market: "KR",
      accessKeyHint: null,
      updatedAt: null
    };
  }

  return {
    configured: true,
    vendorId: decryptString(row.vendor_id_encrypted),
    market: row.market,
    accessKeyHint: row.access_key_last4 ? `...${row.access_key_last4}` : null,
    updatedAt: row.updated_at ?? null
  };
}

export async function getCoupangCredentialSummary(userId: string): Promise<CoupangCredentialSummary> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("user_coupang_credentials")
    .select("user_id,vendor_id_encrypted,access_key_encrypted,secret_key_encrypted,access_key_last4,market,updated_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "INTERNAL_ERROR", "쿠팡 연동 정보를 조회하지 못했습니다.", { details: error.message });
  }

  return toSummary((data as CoupangCredentialRow | null) ?? null);
}

export async function getCoupangCredentials(userId: string): Promise<CoupangCredentials> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("user_coupang_credentials")
    .select("user_id,vendor_id_encrypted,access_key_encrypted,secret_key_encrypted,access_key_last4,market")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new ApiError(500, "INTERNAL_ERROR", "쿠팡 연동 정보를 조회하지 못했습니다.", { details: error.message });
  }

  const row = data as CoupangCredentialRow | null;
  if (!row) {
    throw new ApiError(400, "COUPANG_OPENAPI_NOT_CONFIGURED", "쿠팡 연동 정보가 등록되지 않았습니다.", {
      help: ["대시보드의 쿠팡 연동 페이지에서 vendorId, accessKey, secretKey를 먼저 저장하세요."]
    });
  }

  return {
    vendorId: decryptString(row.vendor_id_encrypted),
    accessKey: decryptString(row.access_key_encrypted),
    secretKey: decryptString(row.secret_key_encrypted),
    market: row.market
  };
}

export async function upsertCoupangCredentials(userId: string, input: CoupangCredentials) {
  const admin = requireAdmin();
  const validated = validateCredentials(input);
  const { error } = await admin.from("user_coupang_credentials").upsert(
    {
      user_id: userId,
      vendor_id_encrypted: encryptString(validated.vendorId),
      access_key_encrypted: encryptString(validated.accessKey),
      secret_key_encrypted: encryptString(validated.secretKey),
      access_key_last4: validated.accessKey.slice(-4),
      market: validated.market,
      updated_at: new Date().toISOString()
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new ApiError(500, "INTERNAL_ERROR", "쿠팡 연동 정보를 저장하지 못했습니다.", { details: error.message });
  }
}
