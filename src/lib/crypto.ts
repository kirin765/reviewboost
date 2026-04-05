import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ApiError } from "@/lib/api_error";

const ALGORITHM = "aes-256-gcm";

function clean(value: string | undefined) {
  return String(value ?? "").trim();
}

function getEncryptionKey() {
  const raw = clean(process.env.APP_CRYPTO_SECRET);
  if (!raw) {
    throw new ApiError(503, "INTERNAL_ERROR", "서버 암호화 키가 설정되지 않았습니다.", {
      help: ["APP_CRYPTO_SECRET 환경변수를 설정하세요."]
    });
  }

  return createHash("sha256").update(raw, "utf8").digest();
}

export function encryptString(plainText: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
}

export function decryptString(cipherText: string) {
  try {
    const payload = Buffer.from(cipherText, "base64");
    const iv = payload.subarray(0, 12);
    const tag = payload.subarray(12, 28);
    const encrypted = payload.subarray(28);
    const decipher = createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    throw new ApiError(500, "INTERNAL_ERROR", "암호화된 자격증명을 복호화할 수 없습니다.");
  }
}
