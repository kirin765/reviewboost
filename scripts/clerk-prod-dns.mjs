#!/usr/bin/env node
/**
 * Clerk 프로덕션 전환용 Cloudflare DNS 헬퍼 — CNAME 2개 추가 (Proxy off/DNS only).
 *
 * 사용법:
 *   node scripts/clerk-prod-dns.mjs            # 토큰을 ~/.cf_dns_token 에서 읽음
 *   CLOUDFLARE_API_TOKEN=xxx node scripts/clerk-prod-dns.mjs
 *
 * 필요 권한: Zone → DNS → Edit (reviewboost.co.kr 존으로 제한 권장)
 * 추가하는 레코드 (Clerk 대시보드 Domains 페이지의 표준값 — go-live 화면의 값과
 * 다르면 --accounts-target / --clerk-target 으로 재정의):
 *   accounts → accounts.clerk.services        (DNS only)
 *   clerk     → frontend-api.clerk.services   (DNS only)
 *
 * 멱등: 이미 같은 내용이면 skip, 다른 내용이면 갱신.
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const ZONE_NAME = "reviewboost.co.kr";
const DEFAULT_ACCOUNTS_TARGET = "accounts.clerk.services";
const DEFAULT_CLERK_TARGET = "frontend-api.clerk.services";
// 이메일(클렁 mail/DKIM) — 도메인 변경 후 Clerk Domains 페이지의 cname_targets 기준.
// 값이 다르면 --mail-target / --dkim1-target / --dkim2-target 으로 재정의.
const DEFAULT_MAIL_TARGET = "mail.46v8o7h9s2jj.clerk.services";
const DEFAULT_DKIM1_TARGET = "dkim1.46v8o7h9s2jj.clerk.services";
const DEFAULT_DKIM2_TARGET = "dkim2.46v8o7h9s2jj.clerk.services";

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

async function cf(path, token, init = {}) {
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) }
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    throw new Error(`Cloudflare API ${res.status} ${path}: ${JSON.stringify(body.errors ?? body)}`);
  }
  return body;
}

async function main() {
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token) {
    try {
      token = readFileSync(join(homedir(), ".cf_dns_token"), "utf8").trim();
    } catch {
      // fallthrough to the friendly error below
    }
  }
  if (!token) {
    console.error("Cloudflare API 토큰 필요: ~/.cf_dns_token 파일 또는 CLOUDFLARE_API_TOKEN env");
    process.exit(2);
  }

  const accountsTarget = arg("accounts-target") ?? DEFAULT_ACCOUNTS_TARGET;
  const clerkTarget = arg("clerk-target") ?? DEFAULT_CLERK_TARGET;
  const mailTarget = arg("mail-target") ?? DEFAULT_MAIL_TARGET;
  const dkim1Target = arg("dkim1-target") ?? DEFAULT_DKIM1_TARGET;
  const dkim2Target = arg("dkim2-target") ?? DEFAULT_DKIM2_TARGET;

  const zones = await cf(`/zones?name=${ZONE_NAME}`, token);
  const zone = zones.result?.[0];
  if (!zone) throw new Error(`존을 찾지 못했습니다: ${ZONE_NAME}`);
  console.log(`zone: ${zone.name} (${zone.id})`);

  const records = await cf(`/zones/${zone.id}/dns_records?per_page=100`, token);
  const existing = new Map(records.result.map((r) => [r.name, r]));

  const want = [
    { name: `accounts.${ZONE_NAME}`, content: accountsTarget },
    { name: `clerk.${ZONE_NAME}`, content: clerkTarget },
    { name: `clkmail.${ZONE_NAME}`, content: mailTarget },
    { name: `clk._domainkey.${ZONE_NAME}`, content: dkim1Target },
    { name: `clk2._domainkey.${ZONE_NAME}`, content: dkim2Target }
  ];

  for (const rec of want) {
    const cur = existing.get(rec.name);
    if (cur) {
      if (cur.type === "CNAME" && cur.content === rec.content && cur.proxied === false) {
        console.log(`✓ 이미 존재 (skip): ${rec.name} → ${rec.content}`);
        continue;
      }
      const updated = await cf(`/zones/${zone.id}/dns_records/${cur.id}`, token, {
        method: "PATCH",
        body: JSON.stringify({ type: "CNAME", name: rec.name, content: rec.content, proxied: false })
      });
      console.log(`↻ 갱신: ${rec.name} → ${updated.result?.content}`);
      continue;
    }
    const created = await cf(`/zones/${zone.id}/dns_records`, token, {
      method: "POST",
      body: JSON.stringify({ type: "CNAME", name: rec.name, content: rec.content, proxied: false, comment: "Clerk custom domain (accounts/clerk)" })
    });
    console.log(`+ 생성: ${created.result?.name} → ${created.result?.content} (proxied: ${created.result?.proxied})`);
  }
  console.log("\n완료. 다음 확인 명령:");
  console.log(`  dig +short accounts.${ZONE_NAME} CNAME`);
  console.log(`  dig +short clerk.${ZONE_NAME} CNAME`);
}

main().catch((e) => { console.error("FAIL:", e.message); process.exit(1); });
