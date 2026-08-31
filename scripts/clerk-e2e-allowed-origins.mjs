#!/usr/bin/env node
/**
 * 로컬 E2E용 Clerk 인스턴스 설정 관리 헬퍼 (allowed_origins + redirect_urls).
 *
 * 배경 (실측 기록: docs/NEXT_SESSION.md "E2E(로컬 dev 서버+prod 키) …"):
 * 프로덕션 Clerk FAPI(https://clerk.reviewboost.co.kr) 와 sk_live_ 키로 로컬
 * Playwright E2E(dev 서버 127.0.0.1:3001) 를 돌리면 두 단계에서 차단된다:
 *   1. POST /v1/client → 400 code:origin_invalid ("Origin must be equal to or a
 *      subdomain of the requesting URL") — 위젯 미초기화.
 *      해결: instance.allowed_origins 에 로컬 Origin 추가 (PATCH /v1/instance).
 *   2. ticket sign-in(setActive) redirect_url 검증 → 400 form_param_value_invalid
 *      ("http://127.0.0.1:3001/dashboard does not match one of the allowed values").
 *      해결: /v1/redirect_urls 에 로컬 패턴(http://127.0.0.1:3001/* 등) 추가.
 *
 * 검증 결과 (2026-08-31):
 *   - 추가 후 POST /v1/client: localhost:3001·127.0.0.1:3001 → 200,
 *     reviewboost.co.kr → 200, https://evil.example.com → 여전히 400.
 *   - E2E(playwright) 인증 테스트 4개 통과 확인.
 *
 * 사용법:
 *   node scripts/clerk-e2e-allowed-origins.mjs            # status (기본)
 *   node scripts/clerk-e2e-allowed-origins.mjs --status
 *   node scripts/clerk-e2e-allowed-origins.mjs --add      # 로컬 dev Origin+Redirect 추가
 *   node scripts/clerk-e2e-allowed-origins.mjs --remove   # 위에서 추가한 항목 제거 (복원)
 *
 * 키: .env.local 의 CLERK_SECRET_KEY (sk_live_) 사용.
 */
import { readFileSync } from "node:fs";

const API = "https://api.clerk.com";
const FAPI = "https://clerk.reviewboost.co.kr";

// 로컬 개발에 쓰는 Origin / Redirect 패턴
// - 평문 dev 서버(3001) + HTTPS 서브도메인(dev.reviewboost.co.kr:3443, scripts/dev-https-proxy.mjs)
// - redirect_urls: 프로덕션 웹 handshake 검증에는 영향 없음(네이티브 앱 전용). 로컬 완전성 위해 유지.
const DEV_ORIGINS = [
  "http://localhost:3001",
  "http://127.0.0.1:3001",
  "https://dev.reviewboost.co.kr:3443",
];
const DEV_REDIRECTS = ["http://127.0.0.1:3001/*", "http://localhost:3001/*", "http://localhost:3000/*", "https://dev.reviewboost.co.kr:3443/*"];

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function secretKey() {
  const match = readFileSync(".env.local", "utf8").match(/CLERK_SECRET_KEY="(sk_(?:live|test)_[^"]+)"/);
  if (!match) {
    console.error(".env.local 에 sk_(live|test)_ CLERK_SECRET_KEY 를 찾지 못했습니다.");
    process.exit(2);
  }
  return match[1];
}

async function api(sk, path, init) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${sk}`, "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  return res;
}

async function getInstance(sk) {
  const res = await api(sk, "/v1/instance");
  if (!res.ok) throw new Error(`GET /v1/instance → ${res.status}`);
  return res.json();
}

async function listRedirectUrls(sk) {
  const res = await api(sk, "/v1/redirect_urls");
  if (!res.ok) throw new Error(`GET /v1/redirect_urls → ${res.status}`);
  return res.json();
}

async function addRedirectUrl(sk, url) {
  const res = await api(sk, "/v1/redirect_urls", { method: "POST", body: JSON.stringify({ url }) });
  if (!res.ok) throw new Error(`POST /v1/redirect_urls ${url} → ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function removeRedirectUrl(sk, id) {
  const res = await api(sk, `/v1/redirect_urls/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /v1/redirect_urls/${id} → ${res.status}`);
}

/** FAPI POST /v1/client 가 해당 Origin 을 받아들이는지 (200=허용, 400=차단). */
async function fapiAcceptsOrigin(origin) {
  const res = await fetch(`${FAPI}/v1/client`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "{}",
  });
  await res.arrayBuffer();
  return res.status;
}

async function main() {
  const sk = secretKey();
  const mode = process.argv.includes("--status") ? "status"
    : process.argv.includes("--remove") ? "remove"
    : process.argv.includes("--add") ? "add"
    : "status";

  const inst = await getInstance(sk);
  if (inst.environment_type !== "production") {
    console.warn(`⚠️  environment_type = ${inst.environment_type} (배포 인스턴스 아님 — 의도 확인 필요)`);
  }
  const currentOrigins = inst.allowed_origins ?? [];
  const currentRedirects = await listRedirectUrls(sk);

  if (mode === "status") {
    console.log("instance.allowed_origins =", JSON.stringify(currentOrigins));
    console.log("instance redirect_urls   =", JSON.stringify(currentRedirects.map((r) => r.url)));
    console.log("--- FAPI POST /v1/client origin 행렬 (200=허용 / 400=차단) ---");
    for (const o of [...DEV_ORIGINS, "https://reviewboost.co.kr", "https://evil.example.com"]) {
      const code = await fapiAcceptsOrigin(o);
      console.log(`  ${code}  ${o}`);
    }
    return;
  }

  if (mode === "remove") {
    const nextOrigins = currentOrigins.filter((o) => !DEV_ORIGINS.includes(o));
    const res = await api(sk, "/v1/instance", { method: "PATCH", body: JSON.stringify({ allowed_origins: nextOrigins }) });
    if (!res.ok) throw new Error(`PATCH /v1/instance → ${res.status}`);
    console.log(`✓ allowed_origins → ${JSON.stringify(nextOrigins)}`);

    for (const r of currentRedirects) {
      if (DEV_REDIRECTS.includes(r.url)) {
        await removeRedirectUrl(sk, r.id);
        console.log(`✓ redirect_urls 제거: ${r.url}`);
      }
    }
    return;
  }

  if (mode === "add") {
    const nextOrigins = [...new Set([...currentOrigins, ...DEV_ORIGINS])];
    const res = await api(sk, "/v1/instance", { method: "PATCH", body: JSON.stringify({ allowed_origins: nextOrigins }) });
    if (!res.ok) throw new Error(`PATCH /v1/instance → ${res.status}`);
    console.log(`✓ allowed_origins → ${JSON.stringify(nextOrigins)}`);

    const existing = new Set(currentRedirects.map((r) => r.url));
    for (const u of DEV_REDIRECTS) {
      if (existing.has(u)) continue;
      const created = await addRedirectUrl(sk, u);
      console.log(`✓ redirect_urls 추가: ${created.url}`);
    }

    console.log("--- 검증(실측) ---");
    for (const o of nextOrigins) {
      const code = await fapiAcceptsOrigin(o);
      console.log(`  origin   ${code === 200 ? "허용" : "차단(!)"}  ${o}`);
    }
    const after = await listRedirectUrls(sk);
    console.log(`  redirect ${after.map((r) => r.url).join(", ") || "(없음)"}`);
    return;
  }

  console.error("알 수 없는 mode:", mode);
  process.exit(2);
}

main().catch((e) => {
  console.error("[clerk-e2e-allowed-origins]", e.message);
  process.exit(1);
});