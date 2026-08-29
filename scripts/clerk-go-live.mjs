#!/usr/bin/env node
/**
 * Clerk go-live 헬퍼 — OAuth 토큰(키체인)으로 Platform API를 직접 호출해
 * 프로덕션 인스턴스를 생성한다 (CLI `clerk link`/`deploy`가 스코프로 막힐 때의 폴백).
 *
 * 사용법:
 *   node scripts/clerk-go-live.mjs --app app_xxxxx
 *   node scripts/clerk-go-live.mjs --app app_xxxxx --domain accounts.reviewboost.co.kr
 *
 * 동작:
 *   POST /v1/platform/applications/{appId}/instances
 *   body: { domain, environment_type: "production", clone_instance_id: <dev 인스턴스> }
 *
 * 성공 시 응답에 프로덕션 secret_key / publishable_key 가 포함된다.
 * (이 키를 scripts/clerk-prod-switch.mjs --secret ... --publishable ... 로 교체)
 */
import { execSync } from "node:child_process";

const DEV_INSTANCE_ID = "ins_3EeYoGJd85zzpQd9QBVYOy5mXrp";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const appId = arg("app");
  const domain = arg("domain") ?? "accounts.reviewboost.co.kr";
  if (!appId) {
    console.error("사용법: node scripts/clerk-go-live.mjs --app app_xxxxx [--domain accounts.reviewboost.co.kr]");
    process.exit(2);
  }

  const json = JSON.parse(
    execSync("security find-generic-password -s clerk-cli -a oauth-access-token -w 2>/dev/null").toString()
  );
  const token = json.accessToken;
  if (!token) {
    console.error("OAuth 토큰을 키체인에서 찾지 못했습니다. `npx -y clerk@latest auth login` 을 먼저 실행하세요.");
    process.exit(2);
  }

  const body = {
    domain,
    environment_type: "production",
    clone_instance_id: DEV_INSTANCE_ID
  };
  console.log(`POST /v1/platform/applications/${appId}/instances`);
  console.log("body:", JSON.stringify(body, null, 1));

  const res = await fetch(`https://api.clerk.com/v1/platform/applications/${appId}/instances`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  console.log("status:", res.status);
  console.log("response:", text.slice(0, 1200));

  if (res.ok) {
    try {
      const j = JSON.parse(text);
      console.log("\n✅ 프로덕션 인스턴스 생성됨:", j.id);
      if (j.secret_key) console.log("secret_key:", j.secret_key.slice(0, 12) + "...");
      if (j.publishable_key) console.log("publishable_key:", j.publishable_key.slice(0, 12) + "...");
      console.log("\n다음 단계: node scripts/clerk-prod-switch.mjs --secret <sk_live_> --publishable <pk_live_>");
    } catch { /* non-json */ }
  } else {
    console.log("\n실패. CLI 경로(clerk link --app <id> → clerk deploy) 또는 대시보드 go-live를 사용하세요.");
  }
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
