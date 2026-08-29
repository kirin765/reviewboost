# 쿠팡 리뷰 크롤링, 서버로 하지 마세요 — Akamai를 이기는 대신 피한 이야기

**요약: 쿠팡·스마트스토어의 리뷰 API는 서버에서 호출하면 Akamai Bot Manager에 차단되지만, 크롬 확장의 content script에서 same-origin으로 호출하면 차단되지 않습니다.** 페이지 origin에서 사용자의 실제 쿠키로 나가는 요청이기 때문입니다. 저는 Railway에 Playwright 컨테이너를 띄우고 xvfb까지 설치해 봇 탐지를 우회하다가, 결국 서버를 한 대도 쓰지 않는 크롬 확장(Manifest V3) 구조로 전부 옮겼습니다. 인프라 비용은 0원이 됐고 차단은 사라졌습니다. 대신 백그라운드 배치 수집을 포기했습니다.

이 글은 그 전환의 기록이고, 코드는 전부 실제로 운영 중인 코드입니다.

---

## 목차

1. [문제: 쿠팡·스마트스토어에는 리뷰 내보내기가 없다](#문제)
2. [1차 시도: 서버 크롤러와 Akamai](#1차-시도)
3. [실패한 코드 안에 이미 답이 있었다](#답)
4. [전환: 크롬 확장 content script](#전환)
5. [무엇을 얻고 무엇을 잃었나](#트레이드오프)
6. [스마트스토어에서 추가로 밟은 것 3가지](#스마트스토어)
7. [서버에 부담을 주지 않는 페이지네이션 규칙](#수집-속도)
8. [자주 묻는 질문](#faq)

---

<h2 id="문제">문제: 쿠팡·스마트스토어에는 리뷰 내보내기가 없다</h2>

쿠팡과 네이버 스마트스토어는 판매자가 자기 상품의 리뷰를 파일로 내보내는 기능을 제공하지 않습니다. 리뷰 200개를 엑셀로 정리하려면 사람이 복사와 붙여넣기를 200번 반복해야 합니다. 실제로 많은 셀러가 그렇게 하고 있습니다.

그래서 상품 URL을 넣으면 CSV를 반환하는 API를 만들기로 했습니다.

<h2 id="1차-시도">1차 시도: 서버 크롤러와 Akamai</h2>

Railway에 Playwright 컨테이너를 올렸습니다. Express 엔드포인트 하나면 뼈대는 끝납니다.

```js
app.post('/api/coupang/reviews/csv', async (req, res) => {
  const reviews = await scrapeReviews(url, limit);
  res.send(Buffer.from(reviewsToCsv(reviews), 'utf-8'));
});
```

문제는 그다음입니다. **쿠팡은 Akamai Bot Manager를 사용합니다.** 데이터센터 IP에서 접속한 헤드리스 브라우저는 상품 페이지 단계에서 Access Denied를 받습니다.

알려진 우회책을 전부 붙였습니다.

```js
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
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/124.0.0.0 Safari/537.36',
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul',
  viewport: { width: 1280, height: 960 },
});

await context.addInitScript(
  `Object.defineProperty(navigator, 'webdriver', { get: () => undefined });`
);
```

그래도 부족해서 결국 headless를 껐습니다. 헤드리스가 아닌 크롬을 리눅스 컨테이너에서 실행하려면 디스플레이가 필요하므로, Dockerfile에 xvfb가 들어갔습니다.

```dockerfile
FROM mcr.microsoft.com/playwright:v1.60.0-jammy
RUN apt-get update && apt-get install -y --no-install-recommends xvfb && \
    rm -rf /var/lib/apt/lists/*
```

가상 디스플레이 위에서 실제 크롬을 띄워 봇 판정을 피하는 단계까지 갔습니다.

<h2 id="답">실패한 코드 안에 이미 답이 있었다</h2>

여기서 결정적인 사실을 하나 만났습니다. **Playwright 안에서도 `context.request.get()`으로 리뷰 API를 호출하면 차단됐습니다.** 통한 것은 오직 이 형태였습니다.

```js
// 상품 페이지 로드 → Akamai 세션 확보 (Access Denied여도 쿠키·세션은 설정된다)
await page.goto(productUrl, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3000);

// 모든 API 호출을 브라우저 '내부'에서 실행한다
const rawReviews = await page.evaluate(async (productId) => {
  const results = [];
  for (let p = 1; p <= 30; p++) {
    const r = await fetch(
      `/next-api/review?productId=${productId}&page=${p}&size=10&sortBy=ORDER_SCORE_ASC`,
      { headers: { accept: 'application/json' } }
    );
    const j = await r.json();
    const contents = j?.rData?.paging?.contents ?? [];
    if (!contents.length) break;
    results.push(...contents);
    if (p >= (j?.rData?.paging?.totalPage ?? 1)) break;
  }
  return results;
}, productId);
```

핵심은 `page.evaluate` 내부에서 **상대 경로로 fetch**했다는 점입니다. 페이지 origin에서, 그 페이지가 이미 보유한 쿠키로 나가는 요청이므로 Akamai가 통과시킵니다. 외부에서 헤더를 아무리 정교하게 흉내내도 실패하던 요청이, 페이지 안에서는 그냥 성공합니다.

부수적으로 확인한 사실이 하나 더 있습니다. **`size=50`은 차단당하고 `size=10`은 통과합니다.** 쿠팡 프론트엔드가 실제로 사용하는 페이지 크기가 10이고, 그 값에서 벗어나면 탐지됩니다.

<h2 id="전환">전환: 크롬 확장 content script</h2>

`page.evaluate` 안에서만 성공하는 이유를 정리하면 필요 조건은 두 가지뿐입니다.

1. 요청이 **해당 사이트의 origin에서** 발생할 것
2. **사용자의 실제 쿠키**가 함께 전송될 것

그리고 이 두 조건을 이미 완벽하게 만족하는 실행 환경이 존재합니다. **사용자 본인의 브라우저입니다.**

세션을 흉내내는 대신 진짜 세션 안에서 실행하면 됩니다. 크롬 확장의 content script가 정확히 그 자리입니다.

```ts
// content script는 페이지 origin에서 실행된다 → same-origin + 실제 쿠키
res = await fetch(coupangReviewApiUrl(productId, page, PAGE_SIZE), {
  headers: { accept: "application/json" },
  credentials: "include"
});

const ct = res.headers.get("content-type") || "";
if (res.status === 403 || !ct.includes("json")) {
  throw new CollectError(
    "BLOCKED",
    "쿠팡이 자동 요청을 차단했습니다.\n페이지를 한 번 스크롤한 뒤 다시 시도해 주세요."
  );
}
```

서버 크롤러의 `page.evaluate` 블록이 거의 그대로 content script로 이동했습니다. 사라진 것은 그 주변 전부입니다. Playwright, Docker, xvfb, User-Agent 스푸핑, `navigator.webdriver` 삭제, Railway 요금이 모두 없어졌습니다.

Manifest V3 설정은 이 정도가 전부입니다.

```json
{
  "manifest_version": 3,
  "permissions": ["activeTab", "storage"],
  "host_permissions": [
    "*://*.coupang.com/*",
    "*://smartstore.naver.com/*",
    "*://brand.naver.com/*"
  ],
  "content_scripts": [{
    "matches": [
      "*://*.coupang.com/*products/*",
      "*://smartstore.naver.com/*/products/*",
      "*://brand.naver.com/*/products/*"
    ],
    "js": ["content.js"],
    "run_at": "document_idle"
  }]
}
```

<h2 id="트레이드오프">무엇을 얻고 무엇을 잃었나</h2>

| 항목 | 서버 크롤러 | 크롬 확장 |
|---|---|---|
| 봇 차단 | Akamai 우회 필요 | 발생하지 않음 |
| 인프라 | Playwright 컨테이너 + xvfb | 없음 |
| 월 고정비 | 컨테이너 + 프록시 비용 | 0원 |
| 동시 요청 | 요청당 크롬 프로세스 1개, OOM 위험 | 사용자 브라우저에 분산 |
| 백그라운드 배치 | 가능 | **불가능** |
| 배포 | `git push` | **크롬 웹스토어 심사** |
| 지원 환경 | 서버만 있으면 됨 | 크롬 사용자만 |

**얻은 것 중 가장 큰 것은 비용이나 안정성이 아니라 권한 경계의 명확성입니다.** 확장은 사용자가 지금 보고 있는 상품 한 건에서만, 사용자가 버튼을 눌렀을 때만 동작합니다. 서버 크롤러 시절에는 누구나 임의의 URL을 던질 수 있는 엔드포인트였고, 그것은 개인정보처리방침에 적기 껄끄러운 물건이었습니다.

**잃은 것 중 가장 큰 것은 백그라운드 배치 수집입니다.** 사용자가 해당 페이지를 열고 있어야 하므로 "매일 밤 상품 50개를 자동 수집" 같은 기능은 이 구조로 만들 수 없습니다. 배치 수집이 제품의 핵심이었다면 이 전환은 틀린 선택이었을 것입니다. 다행히 "지금 보고 있는 상품 하나"가 실제 사용 패턴의 대부분이었습니다.

<h2 id="스마트스토어">스마트스토어에서 추가로 밟은 것 3가지</h2>

같은 구조를 네이버 스마트스토어에 적용하면서 세 가지를 더 확인했습니다.

**1. 브랜드스토어는 API 경로가 다릅니다.** 일반 스마트스토어는 `/i/v1`, 브랜드스토어(`brand.naver.com`)는 `/n/v1`을 사용합니다. 그리고 **잘못된 경로는 404가 아니라 200과 HTML을 반환합니다.** `res.ok`만 검사하면 조용히 깨집니다.

```ts
const apiBase = /brand\.naver\.com/i.test(origin) ? "/n/v1" : "/i/v1";
return { url: `${origin}${apiBase}/contents/reviews/query-pages`, method: "POST", body };
```

**2. 리뷰 API가 요구하는 `checkoutMerchantNo`는 URL에 없습니다.** 페이지가 이미 전송한 요청에서 회수하는 방법이 가장 확실했습니다.

```ts
export function findMerchantNo(resourceUrls: string[], preload?: unknown): string | null {
  for (const u of resourceUrls) {
    const m = u.match(/checkoutMerchantNo=(\d+)/);
    if (m) return m[1];
  }
  return deepFindFirst(preload, ["checkoutMerchantNo", "merchantNo", "storeKeeperNo"]);
}
```

`performance.getEntriesByType('resource')`로 페이지가 방금 보낸 URL 목록을 읽는 방식입니다. content script가 페이지 내부에 있기 때문에 공짜로 되는 일이고, 서버 크롤러였다면 네트워크를 별도로 가로채야 했을 것입니다.

**3. URL의 상품번호가 실제 상품번호가 아닙니다.** 스마트스토어는 채널상품번호(URL에 노출되는 값)와 `originProductNo`가 다를 수 있으며, 리뷰 API는 후자를 사용합니다.

<h2 id="수집-속도">서버에 부담을 주지 않는 페이지네이션 규칙</h2>

브라우저 안에서 실행된다고 해서 무제한으로 요청해도 되는 것은 아닙니다. 페이지네이션 루프에 세 가지 규칙을 넣었습니다.

```ts
export const COLLECT_PAGE_DELAY_MIN_MS = 300;
export const COLLECT_PAGE_DELAY_MAX_MS = 600;
```

- **페이지 사이에 300~600ms 랜덤 지연**을 둡니다. 사람이 스크롤하는 속도에 가깝습니다.
- **일시적 네트워크 오류만 3회까지 백오프 재시도**하고, 차단이나 로그인 요구 같은 단말 오류는 즉시 중단합니다.
- 이미 일부를 수집했다면 그 시점까지만 반환하고 종료합니다.

```ts
try {
  res = await fetchWithRetry(fetchPage, page, opts.sleep);
} catch (err) {
  if (out.length > 0 && !(err instanceof CollectError && err.code !== "NETWORK")) break;
  throw err;
}
```

차단당했을 때 재시도로 밀어붙이는 것은 상대 서버에도 나쁘고 사용자 계정에도 나쁩니다. 실패는 빨리 인정하는 편이 낫습니다.

## 정리

돌아보면 답은 실패한 서버 크롤러 코드 안에 이미 있었습니다. `page.evaluate` 안에서만 성공했다는 사실이 "이 작업은 브라우저 안에서 수행해야 한다"고 말하고 있었는데, 저는 그것을 "브라우저를 서버에 어떻게 잘 심을까"로 읽었습니다. 실제로는 **이미 브라우저를 켜고 있는 사용자에게 코드를 보내면** 되는 문제였습니다.

봇 탐지 우회에 시간을 쓰고 있다면 한 번쯤 물어볼 만합니다. **이 코드가 반드시 내 서버에서 실행되어야 하는가?**

---

## 이 구조로 만든 확장

이 글의 구조를 그대로 구현한 것이 **ReviewBoost 리뷰 수집기**입니다. ReviewBoost 리뷰 수집기는 쿠팡·스마트스토어·브랜드스토어 상품 페이지에서 해당 상품의 공개 리뷰를 수집해 엑셀(.xlsx) 또는 CSV로 내보내는 무료 크롬 확장 프로그램입니다.

30초 동작 영상입니다.

<!-- Velog: 아래 URL을 그대로 한 줄에 붙여넣으면 자동 임베드됩니다 -->
https://youtu.be/Z12O5EXF4cI

- **동작 방식:** 상품 상세 페이지에서 확장 아이콘을 클릭하고 "리뷰 수집"을 누르면, content script가 페이지 origin에서 리뷰를 수집합니다.
- **내보내기:** 별점·내용·작성일이 정리된 엑셀(.xlsx) 또는 CSV 파일로 저장합니다.
- **선택적 분석 연동:** "ReviewBoost로 분석"을 누르면 감정 분류, 부정 키워드 TOP 10, 개선 문구 제안이 담긴 무료 리포트로 이어집니다.
- **데이터 처리:** 엑셀·CSV 다운로드만 사용하면 어떤 데이터도 외부로 전송되지 않습니다. 분석 버튼을 누른 경우에만 리뷰 텍스트가 서버로 전송됩니다.
- **한도:** 무료 하루 50개, 유료 플랜 무제한입니다.

설치: [크롬 웹스토어 — ReviewBoost 리뷰 수집기](https://chromewebstore.google.com/detail/kdmjkpfbccikgbaemcbifemeichmehlm)
분석 도구: [reviewboost.co.kr](https://reviewboost.co.kr)

본 확장 프로그램은 셀러가 자신의 상품 리뷰를 백업·분석하도록 돕기 위한 것이며, 쿠팡·네이버와 제휴 관계가 없습니다.

<h2 id="faq">자주 묻는 질문</h2>

**Q. 쿠팡 리뷰를 서버에서 크롤링할 수 있나요?**
A. 가능하지만 권장하지 않습니다. 쿠팡은 Akamai Bot Manager를 사용하므로 데이터센터 IP의 헤드리스 브라우저는 차단됩니다. 우회하려면 비헤드리스 크롬과 가상 디스플레이(xvfb), 그리고 결국 주거용 프록시가 필요해지며, 탐지 규칙이 바뀔 때마다 유지보수 부담이 발생합니다.

**Q. 크롬 확장에서는 왜 차단되지 않나요?**
A. content script는 페이지와 동일한 origin에서 실행되고 사용자의 실제 쿠키와 세션을 그대로 사용하기 때문입니다. 봇 탐지 시스템 입장에서는 사용자가 그 페이지를 직접 사용하는 것과 구분되지 않습니다.

**Q. 쿠팡 리뷰 API의 페이지 크기는 얼마로 해야 하나요?**
A. `size=10`을 사용해야 합니다. 쿠팡 프론트엔드가 실제로 사용하는 값이며, `size=50`은 차단됩니다.

**Q. 스마트스토어와 브랜드스토어의 리뷰 API 경로가 같나요?**
A. 다릅니다. 일반 스마트스토어는 `/i/v1`, 브랜드스토어(brand.naver.com)는 `/n/v1`을 사용합니다. 경로를 잘못 지정하면 404가 아니라 200 응답과 HTML이 반환되므로 상태 코드만으로는 오류를 감지할 수 없습니다.

**Q. 크롬 확장 방식의 단점은 무엇인가요?**
A. 백그라운드 배치 수집이 불가능합니다. 사용자가 해당 상품 페이지를 열어둔 상태여야 하며, 배포할 때마다 크롬 웹스토어 심사를 거쳐야 하고, 크롬 계열 브라우저 사용자만 이용할 수 있습니다.
