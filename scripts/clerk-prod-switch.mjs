#!/usr/bin/env node
/**
 * Clerk go-live 후 프로덕션 키 교체 헬퍼.
 * - .env.local 의 CLERK_SECRET_KEY / NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY 교체
 * - Vercel(production/preview/development) env 교체
 * - 새 키 검증 (GET /v1/instance → environment_type=production 확인)
 *
 * 사용법:
 *   node scripts/clerk-prod-switch.mjs --secret sk_live_xxx --publishable pk_live_xxx
 *
 * 주의:
 * - 키 교체 시 기존 익스텐션 토큰(CLERK_SECRET_KEY 파생 서명)이 전부 무효화됨
 *   → 사용자는 익스텐션 재연결 필요. 계획된 배포 작업이므로 OK.
 * - 교체 후 반드시 재배포: env -u VERCEL_ORG_ID vercel --prod --yes
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function setEnvLocal(file, key, value) {
  const lines = readFileSync(file, "utf8").split("\n");
  const out = lines.map((line) => {
    if (new RegExp(`^${key}=`).test(line)) return `${key}="${value}"`;
    return line;
  });
  if (!out.some((l) => l.startsWith(`${key}=`))) out.push(`${key}="${value}"`);
  writeFileSync(file, out.join("\n") + "\n");
  console.log(`✓ .env.local ${key} 교체`);
}

async function vercelEnv(key, value, env) {
  execSync(`vercel env rm ${key} ${env} --yes`, { stdio: "ignore", env: { ...process.env, VERCEL_ORG_ID: "" } });
  execSync(`printf '%s' "${value}" | vercel env add ${key} ${env} --yes`, { stdio: "ignore", env: { ...process.env, VERCEL_ORG_ID: "" } });
  console.log(`✓ Vercel ${env}: ${key} 교체`);
}

async function main() {
  const secret = arg("secret");
  const publishable = arg("publishable");
  if (!secret || !publishable) {
    console.error("사용법: node scripts/clerk-prod-switch.mjs --secret sk_live_xxx --publishable pk_live_xxx");
    process.exit(2);
  }
  if (!secret.startsWith("sk_live_") || !publishable.startsWith("pk_live_")) {
    console.error("키가 sk_live_/pk_live_ 형식이 아닙니다 — 프로덕션 키를 확인하세요.");
    process.exit(2);
  }

  // 1) 새 키 검증
  const res = await fetch("https://api.clerk.com/v1/instance", { headers: { authorization: `Bearer ${secret}` } });
  const inst = await res.json();
  console.log("새 키 instance:", inst.id, "| environment_type:", inst.environment_type);
  if (inst.environment_type !== "production") {
    console.error("⚠️  environment_type 이 production 이 아닙니다 — go-live가 완료됐는지 확인하세요.");
  }

  // 2) .env.local 교체
  setEnvLocal(".env.local", "CLERK_SECRET_KEY", secret);
  setEnvLocal(".env.local", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", publishable);

  // 3) Vercel env 교체 (기존 키가 있으므로 rm → add)
  for (const env of ["production", "preview", "development"]) {
    await vercelEnv("CLERK_SECRET_KEY", secret, env);
    await vercelEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", publishable, env);
  }

  console.log("\n완료. 이제 재배포하세요:");
  console.log("  env -u VERCEL_ORG_ID vercel --prod --yes");
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
