import { chromium } from 'playwright';

const PAGE_SIZE = 10; // 쿠팡 실제 페이지 기본값 (50은 차단됨)
const MAX_PAGES = 30; // 최대 300건

// PLAYWRIGHT_HEADLESS=true 명시 시에만 true (기본: false — Mac/Railway+xvfb 모두 headless:false)
const HEADLESS = process.env.PLAYWRIGHT_HEADLESS === 'true';

function extractProductId(url) {
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

export async function scrapeReviews(productUrl, limit = 100) {
  const productId = extractProductId(productUrl);

  let browser;
  try {
    browser = await chromium.launch({
      headless: HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'ko-KR',
      timezoneId: 'Asia/Seoul',
      viewport: { width: 1280, height: 960 },
    });

    await context.addInitScript(
      `Object.defineProperty(navigator, 'webdriver', { get: () => undefined });`
    );

    const page = await context.newPage();

    // 상품 페이지 로드 → Akamai 세션 확보 (Access Denied여도 쿠키/세션 설정됨)
    await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    const pageTitle = await page.title();
    if (pageTitle.startsWith('null -') || pageTitle === '') {
      throw new Error('상품을 찾을 수 없습니다. URL을 확인해주세요.');
    }

    // 모든 API 호출을 브라우저 내부에서 실행 (Akamai 세션 유지)
    const rawReviews = await page.evaluate(
      async (productId) => {
        const results = [];
        const PAGE_SIZE = 10;
        const MAX_PAGES = 30;

        for (let p = 1; p <= MAX_PAGES; p++) {
          try {
            const r = await fetch(
              `/next-api/review?productId=${productId}&page=${p}&size=${PAGE_SIZE}` +
              `&sortBy=ORDER_SCORE_ASC&ratingSummary=false&ratings=&market=`,
              { headers: { accept: 'application/json' } }
            );
            const j = await r.json();
            const contents = j?.rData?.paging?.contents ?? [];
            if (!contents.length) break;
            results.push(...contents);
            if (p >= (j?.rData?.paging?.totalPage ?? 1)) break;
          } catch {
            break;
          }
        }

        return results;
      },
      productId
    );

    await browser.close();
    browser = null;

    if (rawReviews.length === 0) {
      throw new Error('수집된 리뷰가 없습니다. 이 상품에 리뷰가 없거나 봇 차단이 발생했습니다.');
    }

    return rawReviews.slice(0, limit).map(normalizeReview);
  } finally {
    await browser?.close();
  }
}
