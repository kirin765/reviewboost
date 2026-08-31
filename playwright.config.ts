import { existsSync } from "node:fs";
import { loadEnvConfig } from '@next/env';
import { defineConfig, devices } from '@playwright/test';

// Load .env.local (Clerk keys + E2E test-user creds) into the test process.
// .env.local pins NODE_ENV=production; force development so the spawned `next dev`
// webServer serves a dev Edge bundle (a production bundle disallows eval in
// middleware → "Code generation from strings disallowed").
loadEnvConfig(process.cwd());
process.env.NODE_ENV = "development";

// 프로덕션 Clerk 키로 로컬 E2E를 돌리려면 앱 오리진이 프로덕션 도메인의
// 서브도메인(dev.reviewboost.co.kr) + HTTPS 여야 한다 (Clerk FAPI의 오리진/
// redirect_url 검증 — docs/NEXT_SESSION.md "E2E(로컬 dev 서버+prod 키)…" 참고).
// 구성: scripts/dev-https-proxy.mjs(TLS 종료) + certificates/(자체서명, gitignored)
// + Chromium --host-resolver-rules(dev.reviewboost.co.kr → 127.0.0.1). sudo 불필요.
const E2E_HTTPS_ORIGIN = "https://dev.reviewboost.co.kr:3443";
const E2E_HTTPS_PROBE = "https://127.0.0.1:3443";

if (!existsSync("certificates/localhost.pem") || !existsSync("certificates/localhost-key.pem")) {
  throw new Error(
    "E2E용 HTTPS 인증서가 없습니다. 생성 명령: " +
      "openssl req -x509 -newkey rsa:2048 -sha256 -days 825 -nodes " +
      "-keyout certificates/localhost-key.pem -out certificates/localhost.pem " +
      "-subj '/CN=*.reviewboost.co.kr' " +
      "-addext 'subjectAltName=DNS:*.reviewboost.co.kr,DNS:reviewboost.co.kr,DNS:localhost,IP:127.0.0.1' " +
      "(certificates/ 는 gitignored)"
  );
}

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/e2e.spec.ts', '**/global.setup.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: E2E_HTTPS_ORIGIN,
    trace: 'on-first-retry',
    ignoreHTTPSErrors: true,
    launchOptions: {
      args: ['--host-resolver-rules=MAP dev.reviewboost.co.kr 127.0.0.1'],
    },
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    // next dev(3001) + HTTPS 프록시(3443)를 함께 띄운다.
    command: 'node scripts/e2e-web-server.mjs',
    url: E2E_HTTPS_PROBE,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    ignoreHTTPSErrors: true,
  },
});