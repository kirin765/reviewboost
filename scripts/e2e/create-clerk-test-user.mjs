// Creates (or resets the password of) a dedicated Clerk test user for authenticated
// E2E, then writes its credentials to .env.local (gitignored). Idempotent.
//
// Usage: CLERK_SECRET_KEY must be a dev (sk_test_) key. Run from the repo root:
//   export $(grep -E '^CLERK_SECRET_KEY=' .env.local | sed 's/^/ /') && node scripts/e2e/create-clerk-test-user.mjs
// or simply: node -r dotenv/config scripts/e2e/create-clerk-test-user.mjs dotenv_config_path=.env.local
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomBytes } from "node:crypto";

const SK = process.env.CLERK_SECRET_KEY;
if (!SK || !SK.startsWith("sk_test_")) {
  console.error("Refusing to run: CLERK_SECRET_KEY missing or not a test (sk_test_) key.");
  process.exit(1);
}
const EMAIL = process.env.E2E_CLERK_USER_EMAIL || "e2e+clerk_test@reviewboost.co.kr";
const PASSWORD = randomBytes(18).toString("base64").replace(/[+/=]/g, "") + "aA1!";
const API = "https://api.clerk.com/v1";
const H = { Authorization: `Bearer ${SK}`, "Content-Type": "application/json" };

async function findUser() {
  const r = await fetch(`${API}/users?email_address=${encodeURIComponent(EMAIL)}`, { headers: H });
  if (!r.ok) throw new Error(`list users failed: ${r.status} ${await r.text()}`);
  const arr = await r.json();
  return Array.isArray(arr) && arr.length ? arr[0] : null;
}

async function main() {
  let user = await findUser();
  if (user) {
    const r = await fetch(`${API}/users/${user.id}`, {
      method: "PATCH", headers: H,
      body: JSON.stringify({ password: PASSWORD, skip_password_checks: true })
    });
    if (!r.ok) throw new Error(`patch failed: ${r.status} ${await r.text()}`);
    console.log(`Reset password for existing test user (${user.id}).`);
  } else {
    const r = await fetch(`${API}/users`, {
      method: "POST", headers: H,
      body: JSON.stringify({ email_address: [EMAIL], password: PASSWORD, skip_password_checks: true })
    });
    if (!r.ok) throw new Error(`create failed: ${r.status} ${await r.text()}`);
    user = await r.json();
    console.log(`Created test user (${user.id}).`);
  }

  const path = ".env.local";
  let body = existsSync(path) ? readFileSync(path, "utf8") : "";
  body = body.split("\n").filter((l) => !/^E2E_CLERK_USER_(EMAIL|PASSWORD)=/.test(l)).join("\n").replace(/\n+$/, "");
  body += `\nE2E_CLERK_USER_EMAIL=${EMAIL}\nE2E_CLERK_USER_PASSWORD=${PASSWORD}\n`;
  writeFileSync(path, body);
  console.log(`Wrote E2E_CLERK_USER_EMAIL / E2E_CLERK_USER_PASSWORD to ${path} (email: ${EMAIL}).`);
}
main().catch((e) => { console.error(String(e)); process.exit(1); });
