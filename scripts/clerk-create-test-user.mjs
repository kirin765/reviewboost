#!/usr/bin/env node
/**
 * 프로덕션 Clerk 인스턴스에 E2E 테스트 유저 생성.
 * (go-live 후 프로덕션은 빈 사용자 풀이므로, Playwright E2E용 유저를 만들어야 한다.
 *  기존 dev 인스턴스의 E2E_CLERK_USER_EMAIL 유저는 복제되지 않음)
 *
 * 사용법:
 *   node scripts/clerk-create-test-user.mjs --secret sk_live_xxx --email test@example.com --password 'xxx'
 *
 * 옵션:
 *   --firstName / --lastName  (기본: E2E / User)
 *   --write-env               .env.local 의 E2E_CLERK_USER_EMAIL/PASSWORD 갱신
 */
import { readFileSync, writeFileSync } from "node:fs";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function main() {
  const secret = arg("secret");
  const email = arg("email");
  const password = arg("password");
  if (!secret || !email || !password) {
    console.error("사용법: node scripts/clerk-create-test-user.mjs --secret sk_live_xxx --email ... --password ...");
    process.exit(2);
  }

  const res = await fetch("https://api.clerk.com/v1/users", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({
      email_address: [email],
      password,
      first_name: arg("firstName") ?? "E2E",
      last_name: arg("lastName") ?? "User",
      public_metadata: { e2e: true }
    })
  });
  const body = await res.json();
  console.log("status:", res.status);
  if (!res.ok) {
    console.error("생성 실패:", JSON.stringify(body).slice(0, 400));
    process.exit(1);
  }
  console.log("✓ 유저 생성:", body.id, "|", email);

  if (arg("write-env")) {
    const file = ".env.local";
    const src = readFileSync(file, "utf8");
    const out = src
      .split("\n")
      .map((line) => {
        if (/^E2E_CLERK_USER_EMAIL=/.test(line)) return `E2E_CLERK_USER_EMAIL="${email}"`;
        if (/^E2E_CLERK_USER_PASSWORD=/.test(line)) return `E2E_CLERK_USER_PASSWORD="${password}"`;
        return line;
      })
      .join("\n");
    writeFileSync(file, out + "\n");
    console.log("✓ .env.local E2E_CLERK_USER_* 갱신");
  }
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
