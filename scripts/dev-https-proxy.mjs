#!/usr/bin/env node
/**
 * 로컬 E2E용 HTTPS 리버스 프록시 (dev 서버 127.0.0.1:3001 → https://127.0.0.1:3443)
 *
 * 배경: 프로덕션 Clerk FAPI 는 오리진/redirect_url 검증에서 localhost 를 거부한다.
 * 공식 가이드(https://clerk.com/docs/guides/development/troubleshooting/using-production-keys-in-development)
 * 방식 = 프로덕션 도메인의 서브도메인을 localhost 로 매핑 + HTTPS. 이 스크립트는
 *   - Chromium --host-resolver-rules 로 dev.reviewboost.co.kr → 127.0.0.1 매핑
 *   - 이 프록시가 TLS(자체서명)를 종료하고 평문 dev 서버(3001)로 전달
 * 하여 sudo(/etc/hosts) 없이 같은 효과를 낸다. (실측: 2026-08-31)
 *
 * 사용법:
 *   node scripts/dev-https-proxy.mjs            # 3443에서 수신, 127.0.0.1:3001로 전달
 *   PORT=3443 UPSTREAM=http://127.0.0.1:3001 node scripts/dev-https-proxy.mjs
 *
 * 주의:
 * - 자체서명 인증서(certificates/{localhost-key.pem,localhost.pem}) — gitignored
 * - HMR WebSocket(wss) 업그레이드는 프록시하지 않는다 (dev E2E에 불필요).
 * - dev 전용. 프로덕션/빌드에 미포함.
 */
import { createServer } from "node:https";
import { request as httpRequest } from "node:http";
import { readFileSync } from "node:fs";

const PORT = Number(process.env.PORT ?? 3443);
const UPSTREAM = new URL(process.env.UPSTREAM ?? "http://127.0.0.1:3001");

const key = readFileSync("certificates/localhost-key.pem");
const cert = readFileSync("certificates/localhost.pem");

const server = createServer({ key, cert }, (req, res) => {
  const headers = { ...req.headers };
  // Host 유지(dev.reviewboost.co.kr:3443) — Next dev(그리고 Clerk 미들웨어의
  // handshake redirect_url 계산)가 진짜 오리진을 알 수 있어야 함
  // x-forwarded-*: TLS 종료 프록시라 앱 쪽 CSRF 검증(isSameOriginRequest)이
  // expectedOrigin 을 https://dev.reviewboost.co.kr:3443 로 계산하게 함
  headers["x-forwarded-proto"] = "https";
  headers["x-forwarded-host"] = headers.host ?? `dev.reviewboost.co.kr:${PORT}`;
  const upstreamReq = httpRequest(
    {
      hostname: UPSTREAM.hostname,
      port: UPSTREAM.port,
      path: req.url,
      method: req.method,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
      upstreamRes.pipe(res);
    }
  );
  upstreamReq.on("error", (err) => {
    console.error("[dev-https-proxy]", err.code ?? err.message);
    res.writeHead(502).end("proxy error");
  });
  req.pipe(upstreamReq);
});

server.on("upgrade", (_req, socket) => socket.destroy()); // HMR(wss)은 프록시 안 함 — 조용히 닫기
server.on("clientError", (_err, socket) => socket.destroy());

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[dev-https-proxy] https://dev.reviewboost.co.kr:${PORT} → ${UPSTREAM.href}`);
});