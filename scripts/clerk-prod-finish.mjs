#!/usr/bin/env node
/**
 * Clerk go-live 완료 후 "마무리" 파이프라인 — 키 교체 → 재배포 → 운영 검증까지 한 번에.
 *
 * 사용법:
 *   node scripts/clerk-prod-finish.mjs --secret sk_live_xxx --publishable pk_live_xxx
 *
 * 단계:
 *   1) 새 키 검증 (GET /v1/instance → environment_type=production 확인)
 *   2) .env.local + Vercel(production/preview/development) 키 교체
 *   3) `vercel --prod --yes` 재배포 (기다림)
 *   4) 운영 검증: /api/health, /api/auth/social/{naver,kakao}/start 307,
 *      accounts/clerk.reviewboost.co.kr 도메인 (403→200/JSON 전환 확인)
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function setEnvLocal(file, key, value) {
  const lines = readFileSync(file, "utf8").split("\n");
  const out = lines.map((line) => (new RegExp(`^${key}=`).test(line) ? `${key}="${value}"` : line));
  if (!out.some((l) => l.startsWith(`${key}=`))) out.push(`${key}="${value}"`);
  writeFileSync(file, out.join("\n") + "\n");
  console.log(`✓ .env.local ${key} 교체`);
}

async function vercelEnv(key, value, env) {
  execSync(`vercel env rm ${key} ${env} --yes`, { stdio: "ignore", env: { ...process.env, VERCEL_ORG_ID: "" } });
  execSync(`printf '%s' "${value}" | vercel env add ${key} ${env} --yes`, { stdio: "ignore", env: { ...process.env, VERCEL_ORG_ID: "" } });
  console.log(`✓ Vercel ${env}: ${key}`);
}

async function check(url, opts = {}) {
  try {
    const res = await fetch(url, { redirect: "manual", ...opts });
    return { status: res.status, location: res.headers.get("location") ?? "" };
  } catch (e) {
    return { status: "ERR", location: String(e.message).slice(0, 80) };
  }
}

async function main() {
  const secret = arg("secret");
  const publishable = arg("publishable");
  if (!secret || !publishable) {
    console.error("사용법: node scripts/clerk-prod-finish.mjs --secret sk_live_xxx --publishable pk_live_xxx");
    process.exit(2);
  }
  if (!secret.startsWith("sk_live_") || !publishable.startsWith("pk_live_")) {
    console.error("sk_live_/pk_live_ 형식이 아닙니다.");
    process.exit(2);
  }

  // 1) 키 검증
  const inst = await fetch("https://api.clerk.com/v1/instance", { headers: { authorization: `Bearer ${secret}` } }).then((r) => r.json());
  console.log("새 키 instance:", inst.id, "| environment_type:", inst.environment_type);
  if (inst.environment_type !== "production") {
    console.error("⚠️ production 이 아닙니다 — go-live 확인 필요. 중단합니다.");
    process.exit(3);
  }

  // 2) 키 교체
  setEnvLocal(".env.local", "CLERK_SECRET_KEY", secret);
  setEnvLocal(".env.local", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", publishable);
  for (const env of ["production", "preview", "development"]) {
    await vercelEnv("CLERK_SECRET_KEY", secret, env);
    await vercelEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", publishable, env);
  }

  // 3) 재배포
  console.log("\n재배포 시작 (2~3분)...");
  execSync("vercel --prod --yes", { stdio: "inherit", env: { ...process.env, VERCEL_ORG_ID: "" }, timeout: 420000 });

  // 4) 검증
  console.log("\n=== 운영 검증 ===");
  console.log("/api/health:", JSON.stringify(await check("https://reviewboost.co.kr/api/health")));
  console.log("naver start:", JSON.stringify(await check("https://reviewboost.co.kr/api/auth/social/naver/start")));
  console.log("kakao start:", JSON.stringify(await check("https://reviewboost.co.kr/api/auth/social/kakao/start")));
  console.log("accounts 도메인 (403→Clerk 응답 전환 확인):", JSON.stringify(await check("https://accounts.reviewboost.co.kr/v1/environment")));
  console.log("clerk 도메인:", JSON.stringify(await check("https://clerk.reviewboost.co.kr/v1/environment")));
  console.log("\n완료. 다음 단계: 네이버/카카오 로그인 + 게스트 결제 실측 (브라우저 필요)");
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
