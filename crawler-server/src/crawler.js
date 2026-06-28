import { chromium } from 'patchright';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';

const PAGE_SIZE = 10; // 쿠팡 실제 페이지 기본값 (50은 차단됨)
const MAX_PAGES = 30; // 최대 300건

// 기본 headed (Akamai가 headless 탐지). PLAYWRIGHT_HEADLESS=true 명시 시에만 headless.
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS === 'true';
// 진짜 Chrome 채널 권장(번들 Chromium보다 실 TLS/JA3 핑거프린트). 비우면 번들 chromium.
const CHANNEL = (process.env.PLAYWRIGHT_CHANNEL ?? 'chrome').trim() || undefined;

const COUPANG_HOSTS = new Set(['www.coupang.com', 'm.coupang.com', 'coupang.com']);

function extractProductId(url) {
  let host;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    throw new Error('올바른 URL이 아닙니다: ' + url);
  }
  if (!COUPANG_HOSTS.has(host)) {
    throw new Error('쿠팡 상품 URL만 지원합니다: ' + url);
  }
  const m = url.match(/\/(?:vp\/)?products\/(\d+)/);
  if (!m) throw new Error('상품 ID를 URL에서 추출할 수 없습니다: ' + url);
  return m[1];
}

function msToDate(ms) {
  if (!ms) return '';
  return new Date(Number(ms)).toISOString().slice(0, 10);
}

function normalizeReview(raw) {
  return {
    rating: raw.rating ?? '',
    title: raw.title ?? raw.reviewTitle ?? '',
    content: raw.content ?? raw.reviewContent ?? '',
    author: raw.displayName ?? raw.nickname ?? raw.member?.name ?? '',
    date: msToDate(raw.reviewAt ?? raw.createdAt),
    helpfulCount: raw.helpfulCount ?? 0,
  };
}

// residential 프록시(env 주입). 데이터센터 IP(Render)를 가리는 핵심.
function buildProxy() {
  const server = (process.env.PROXY_SERVER ?? '').trim();
  if (!server) return undefined;
  const proxy = { server };
  const username = (process.env.PROXY_USERNAME ?? '').trim();
  const password = (process.env.PROXY_PASSWORD ?? '').trim();
  if (username) proxy.username = username;
  if (password) proxy.password = password;
  return proxy;
}

function looksBlocked(text) {
  return /Access Denied|error403|Pardon Our Interruption|Reference\s*#/i.test(text || '');
}

export async function scrapeReviews(productUrl, limit = 100) {
  const productId = extractProductId(productUrl);
  const proxy = buildProxy();
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-crawler-'));

  let context;
  try {
    // patchright 권장: launchPersistentContext + channel:chrome + headed. 커스텀 UA/stealth 패치는
    // patchright가 내부 처리하므로 추가하지 않는다(추가하면 오히려 탐지 단서가 됨).
    context = await chromium.launchPersistentContext(userDataDir, {
      channel: CHANNEL,
      headless: HEADLESS,
      viewport: null,
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      ...(proxy ? { proxy } : {}),
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });

    const page = context.pages()[0] ?? (await context.newPage());

    // 상품 페이지 로드 → Akamai 세션 확보
    const resp = await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    const status = typeof resp?.status === 'function' ? resp.status() : 0;
    const title = await page.title();
    const bodyText = (await page.content()).slice(0, 6000);

    // body 기반 차단 감지(가장 위험한 실패 모드: 200 + Access Denied 페이지를 status로는 못 잡음)
    if (status === 403 || looksBlocked(title) || looksBlocked(bodyText)) {
      throw new Error('AKAMAI_BLOCKED: 봇 차단으로 상품 페이지 접근이 거부되었습니다. residential 프록시/엔진 설정이 필요합니다.');
    }
    // URL은 reviewboost 단에서 쿠팡 상품 형식 검증 후 전달되므로, 빈/널 타이틀은 잘못된 URL보다
    // 봇 차단 챌린지(빈 페이지)일 가능성이 높다.
    if (title.startsWith('null -') || title === '') {
      throw new Error('AKAMAI_BLOCKED: 빈 응답(봇 차단 추정)을 받았습니다. residential 프록시/엔진 설정이 필요합니다.');
    }

    // 모든 리뷰 API 호출을 브라우저 내부에서 실행(Akamai 세션/TLS 유지)
    const out = await page.evaluate(
      async (productId) => {
        const results = [];
        const PAGE_SIZE = 10;
        const MAX_PAGES = 30;
        let blocked = false;
        let firstStatus = 0;

        for (let p = 1; p <= MAX_PAGES; p++) {
          try {
            const r = await fetch(
              `/next-api/review?productId=${productId}&page=${p}&size=${PAGE_SIZE}` +
              `&sortBy=ORDER_SCORE_ASC&ratingSummary=false&ratings=&market=`,
              { headers: { accept: 'application/json' } }
            );
            if (p === 1) firstStatus = r.status;
            const ct = r.headers.get('content-type') || '';
            // 403 또는 비-JSON(차단 HTML) → 봇 차단 신호
            if (r.status === 403 || !ct.includes('json')) {
              blocked = true;
              break;
            }
            const j = await r.json();
            const contents = j?.rData?.paging?.contents ?? [];
            if (!contents.length) break;
            results.push(...contents);
            if (p >= (j?.rData?.paging?.totalPage ?? 1)) break;
          } catch {
            break;
          }
        }

        return { results, blocked, firstStatus };
      },
      productId
    );

    if (out.blocked) {
      throw new Error('AKAMAI_BLOCKED: 리뷰 API가 봇 차단되었습니다. residential 프록시/엔진 설정이 필요합니다.');
    }
    if (out.results.length === 0) {
      throw new Error('수집된 리뷰가 없습니다. 이 상품에 리뷰가 없을 수 있습니다.');
    }

    return out.results.slice(0, limit).map(normalizeReview);
  } finally {
    await context?.close();
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup failure
    }
  }
}
