# ReviewBoost 리뷰 수집기 (Chrome · Firefox MV3)

쿠팡·스마트스토어 상품 페이지에서 그 상품의 리뷰를 수집해 **엑셀(.xlsx)/CSV로 내려받고**, 선택적으로
**ReviewBoost 무료 분석**으로 보내는 브라우저 확장 프로그램.

콘텐츠 스크립트가 **페이지 origin + 사용자 실제 쿠키** 안에서 내부 리뷰 API를 호출하므로,
서버 크롤러를 막던 Akamai 차단·프록시·OOM 문제 없이 동작한다.

## 개발

```bash
cd extension
npm install
npm run test          # 순수 함수 단위 테스트 (vitest)
npm run typecheck     # tsc --noEmit
npm run build         # Chrome/Edge/웨일 → dist/
npm run build:firefox # Firefox → dist-firefox/ (+ package:firefox 는 ZIP까지)
npm run build:all     # 두 빌드 모두
```

## 브라우저에 로드 (unpacked)

**Chrome / Edge / 웨일**

1. `npm run build`
2. `chrome://extensions` (Edge `edge://extensions`) → 개발자 모드 ON → **압축해제된 확장 프로그램을 로드** → `extension/dist` 선택
3. 쿠팡(`/vp/products/...`) 또는 스마트스토어(`/{store}/products/...`) 상품 페이지에서 아이콘 클릭

**Firefox**

1. `npm run build:firefox`
2. `about:debugging#/runtime/this-firefox` → **임시 부가 기능 로드** → `extension/dist-firefox/manifest.json` 선택
   (Firefox 140+ 필요 — 아래 "브라우저별 차이" 참고)
3. 동일하게 상품 페이지에서 아이콘 클릭

로컬 ReviewBoost(`http://localhost:3001`)로 깔때기를 테스트하려면 `src/lib/config.ts`의 `RB_ORIGIN`을
`http://localhost:3001`로 바꿔 다시 빌드한다.

## 브라우저별 차이

Chrome(MV3 service worker)과 Firefox(MV3 event page)는 manifest·백그라운드 형태가 달라 빌드를 분리한다.

| | Chrome / Edge / 웨일 | Firefox |
|---|---|---|
| manifest | `public/manifest.json` | `public/manifest.firefox.json` |
| background | `service_worker` | `scripts` (event page) |
| 웹↔익스텐션 통신 | `externally_connectable` + `chrome.runtime.sendMessage` | `bridge.js` content script + `window.postMessage` |
| 최소 버전 | Chrome 110+ | Firefox 140+ |

- **Firefox 는 `externally_connectable` 을 지원하지 않는다**(bug 1319168). 그래서 reviewboost.co.kr 에
  `bridge.js` 를 주입해, 웹 페이지의 `window.postMessage` 요청(PULL_REPORT/AUTH_TOKEN)을 background 로
  중계하고 응답을 돌려준다. 웹 앱은 `src/lib/extensionBridge.ts` 에서 Chrome 직접 호출/브리지를 자동 선택한다.
- 브랜드스토어 캡처 훅은 `scripting.executeScript({world:"MAIN"})` 를 쓰며, Firefox 는 128+ 부터 지원한다.
- AMO 제출을 위해 `browser_specific_settings.gecko`(id·data_collection_permissions)를 포함한다. 제출 절차는
  `FIREFOX_STORE.md` 참고.

## 라이브 검증 상태

- **쿠팡 (Risk A): ✅ 확인됨.** 실제 상품 페이지에서 content script와 동일한 same-origin fetch가
  Akamai 차단 없이 리뷰 JSON 반환(라이브 확인). 막히면 페이지 한 번 스크롤 후 재시도.
- **스마트스토어 (Risk B): ✅ 확정됨.** 라이브 네트워크 캡처로 확정:
  - 엔드포인트: `POST /i/v1/contents/reviews/query-pages`
    body `{ checkoutMerchantNo, originProductNo, page, pageSize, reviewSearchSortType: "REVIEW_RANKING" }`
  - merchant(`checkoutMerchantNo`)는 페이지가 이미 보낸 요청 URL(`performance` resource timing)에서 추출
  - 리뷰 필드: `reviewContent`/`reviewScore`/`createDate`/`maskedWriterId`
- **브랜드스토어 (brand.naver.com): ✅ 2026-08 수정.** 일반 스마트스토어와 프론트가 달라 세 가지가 틀렸다:
  - 정렬 필드명: `reviewSearchSortType` → **`searchSortType`** (브랜드스토어 번들 전체가 이 필드를 쓴다)
  - originProductNo: URL productNo 는 채널상품번이라 **원본상품번과 다르다**. preload 의
    `simpleProductForDetailPage.productNo` / `channelProductNos↔originalProductNos` 매핑으로 우회.
  - **묶음상품(group product)**: 브랜드스토어의 "묶음" 상품은 전용 엔드포인트를 쓴다. 라이브 확인:
    `GET /n/v1/contents/reviews/group-products/product-summary/{groupProductNo}/reviews/GENERAL?checkoutMerchantNo=…&searchSortType=REVIEW_RANKING&page=&pageSize=`
    (GENERAL=전체. 페이지가 보낸 `group-products/product-summary/{gp}` resource URL 로 판별)
  - 브랜드스토어 API 는 `x-client-rtk`/`x-client-rts`/`x-client-version` 헤더를 보낸다.
    인라인 `<script>` 의 `__CLIENT_RTK_RTS_STATE__` 를 파싱해 재사용한다.
  - 안전망: 페이지가 직접 보낸 query-pages 요청(url/body/headers)을 캡처해 그대로 재사용(replay)한다.
    캡처 훅은 `chrome.scripting.executeScript(world:"MAIN")` 로 주입한다 — 브랜드스토어 CSP 가
    인라인 `<script>` 를 막기 때문(`script-src … chrome-extension` 에 `'unsafe-inline'` 없음).

## 리뷰 수집 기본값 · 최근 기록

- 팝업의 기본 수집 개수는 **10개** (`COLLECT_DEFAULT_MAX = 10`).
- 수집 완료 결과는 `chrome.storage.local`(`rb_history`)에 **최대 5건** 보관된다.
  팝업을 닫아도 "최근 수집 기록"에서 복원해 엑셀/CSV 다운로드·분석을 다시 할 수 있다.

## ReviewBoost 연동

- 깔때기 엔드포인트: `POST /api/extension/analyze` (CORS, chrome-extension origin echo, 무로그인 free 분석)
- 결과 페이지: `/extension-report` (Chrome 은 `externally_connectable`, Firefox 는 `bridge.js`
  postMessage 브리지로 payload 전달 → 기존 `AnalysisResults` 재사용 렌더)
- 연결 페이지: `/extension-connect` (동일 경로로 AUTH_TOKEN 저장)
- 개인정보처리방침(웹스토어 등록용): `/extension-privacy`

## 올리브영

- `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=...` 상품 페이지에서 수집합니다.
- 데스크톱 페이지가 사용하는 `m.oliveyoung.co.kr/review/api/v2/reviews/cursor`를 동일한 로그인 세션으로 호출합니다. 다음 페이지는 ID·점수·개수 커서를 사용합니다.
- 리뷰 본문·별점·작성일·공개 닉네임·도움 수·이미지 URL을 수집합니다. 사이트와 동일하게 연결 상품의 리뷰가 포함될 수 있습니다. 로그인 요구·요청 제한은 오류로 안내하며 중복 페이지는 중단합니다.

## 톡스토어

- `https://store.kakao.com/{스토어}/products/{상품번호}` 상품 페이지에서 수집합니다.
- 페이지와 같은 오리진(store.kakao.com)의 내부 JSON API(`/a/f-m/{스토어}/products/{번호}/reviews`)를 호출합니다. page는 0부터, size는 50, 기본 정렬은 사이트 기본값(추천순)입니다. [실측 2026-10-14] 표시 7,943개 상품에서 마지막 페이지까지 수집됨을 확인했습니다.
- 리뷰 ID 기준 중복 제거, 같은 페이지만 반복되면 종료 등 기존 수집 안전장치가 동일하게 적용됩니다.
- **별점은 4점 척도**(4=매우 만족, 3=만족, 2=아쉬움, 1=매우 아쉬움)라서, 공용 5점 척도로 의미를 보존해 변환합니다(4→5, 3→4, 2→2, 1→1). 본문·작성일(KST)·마스킹 닉네임·도움 수·이미지 URL을 수집합니다.
