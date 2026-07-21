import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * 크롬 익스텐션용 장수명 API 토큰. Clerk 세션 토큰은 60초짜리라 확장에 줄 수
 * 없어서, CLERK_SECRET_KEY 에서 파생한 키로 서명한 자체 토큰을 발급한다.
 * 형식: base64url(payload JSON) + "." + base64url(HMAC-SHA256(payload))
 */

const TOKEN_VERSION = "v1";
export const EXTENSION_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000;

function signingKey(): Buffer | null {
  const secret = String(process.env.CLERK_SECRET_KEY ?? "").trim();
  if (!secret) return null;
  return createHash("sha256").update(`reviewboost-extension-token:${secret}`).digest();
}

export function isExtensionTokenConfigured(): boolean {
  return signingKey() !== null;
}

export function issueExtensionToken(userId: string, now = Date.now()): { token: string; expiresAt: number } | null {
  const key = signingKey();
  if (!key || !userId) return null;
  const expiresAt = now + EXTENSION_TOKEN_TTL_MS;
  const payload = Buffer.from(JSON.stringify({ v: TOKEN_VERSION, uid: userId, exp: expiresAt }), "utf8");
  const sig = createHmac("sha256", key).update(payload).digest();
  return { token: `${payload.toString("base64url")}.${sig.toString("base64url")}`, expiresAt };
}

export function verifyExtensionToken(token: string | null | undefined, now = Date.now()): { userId: string } | null {
  const key = signingKey();
  const raw = String(token ?? "").trim();
  if (!key || !raw) return null;

  const dot = raw.indexOf(".");
  if (dot <= 0 || dot === raw.length - 1) return null;

  let payload: Buffer;
  let sig: Buffer;
  try {
    payload = Buffer.from(raw.slice(0, dot), "base64url");
    sig = Buffer.from(raw.slice(dot + 1), "base64url");
  } catch {
    return null;
  }

  const expected = createHmac("sha256", key).update(payload).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  try {
    const data = JSON.parse(payload.toString("utf8")) as { v?: unknown; uid?: unknown; exp?: unknown };
    if (data.v !== TOKEN_VERSION) return null;
    if (typeof data.uid !== "string" || !data.uid) return null;
    if (typeof data.exp !== "number" || data.exp < now) return null;
    return { userId: data.uid };
  } catch {
    return null;
  }
}
