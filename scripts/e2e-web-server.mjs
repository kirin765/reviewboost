#!/usr/bin/env node
/**
 * Playwright E2E webServer 런처 — dev 서버(3001, 평문) + HTTPS 프록시(3443)를 함께 띄운다.
 *
 * 이유: 프로덕션 Clerk 키(sk_live_)와 로컬 E2E를 돌리려면 앱 오리진이
 * `dev.reviewboost.co.kr`(프로덕션 도메인의 서브도메인) + HTTPS 여야 한다.
 *   - dev-https-proxy.mjs 가 TLS(자체서명)를 종료하고 127.0.0.1:3001 로 전달
 *   - Chromium --host-resolver-rules 로 dev.reviewboost.co.kr → 127.0.0.1 매핑 (playwright.config.ts)
 *   - sudo(/etc/hosts) 불필요 — 전체 로컬 구성 (certificates/ 는 gitignored)
 *
 * 사용법:
 *   node scripts/e2e-web-server.mjs          # 개발 중 수동 실행
 *   (Playwright가 webServer command 로 자동 실행)
 */
import { spawn } from "node:child_process";
import { request } from "node:http";

const DEV_PORT = 3001;
const HTTPS_PORT = 3443;
const HOST = "127.0.0.1";

function startDev() {
  // -H 0.0.0.0: `--hostname 127.0.0.1`를 쓰면 Next dev가 자기 자신으로
  // 프록시를 돌다 ECONNRESET(500) 루프에 빠지는 버그가 있음 (실측 2026-08-31).
  const child = spawn(
    "npx",
    ["next", "dev", "-H", "0.0.0.0", "-p", String(DEV_PORT)],
    { stdio: "inherit", env: { ...process.env, DEV_FORCE_ANALYSIS_MODE: "heuristic" } }
  );
  child.on("exit", (code) => {
    if (code !== 0) console.error(`[e2e-web-server] next dev exited with code ${code}`);
  });
  return child;
}

function startProxy() {
  const child = spawn("node", ["scripts/dev-https-proxy.mjs"], {
    stdio: "inherit",
    env: { ...process.env, PORT: String(HTTPS_PORT), UPSTREAM: `http://${HOST}:${DEV_PORT}` },
  });
  child.on("exit", (code) => {
    if (code !== 0) console.error(`[e2e-web-server] https proxy exited with code ${code}`);
  });
  return child;
}

function waitHttps(timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = request(
        { hostname: HOST, port: HTTPS_PORT, path: "/", method: "GET", rejectUnauthorized: false },
        (res) => {
          res.resume();
          const ok = res.statusCode !== undefined && res.statusCode >= 200 && res.statusCode < 500;
          if (ok) return resolve();
          retry();
        }
      );
      req.on("error", retry);
      req.end();
      function retry() {
        if (Date.now() > deadline) return reject(new Error(`HTTPS 서버 ${HTTPS_PORT} 응답 대기 시간 초과`));
        setTimeout(tick, 1000);
      }
    };
    tick();
  });
}

const dev = startDev();
const proxy = startProxy();

async function shutdown() {
  for (const c of [proxy, dev]) {
    if (!c.killed) c.kill("SIGTERM");
  }
  process.exit(0);
}
process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

try {
  await waitHttps();
  console.log(`[e2e-web-server] ready: https://dev.reviewboost.co.kr:${HTTPS_PORT} → http://127.0.0.1:${DEV_PORT}`);
} catch (err) {
  console.error("[e2e-web-server]", err.message);
  shutdown();
  process.exit(1);
}