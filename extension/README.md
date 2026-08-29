# ReviewBoost 리뷰 수집기 (Chrome MV3)

쿠팡·스마트스토어 상품 페이지에서 그 상품의 리뷰를 수집해 **엑셀(.xlsx)/CSV로 내려받고**, 선택적으로
**ReviewBoost 무료 분석**으로 보내는 크롬 확장 프로그램.

콘텐츠 스크립트가 **페이지 origin + 사용자 실제 쿠키** 안에서 내부 리뷰 API를 호출하므로,
서버 크롤러를 막던 Akamai 차단·프록시·OOM 문제 없이 동작한다.

## 개발

```bash
cd extension
npm install
npm run test       # 순수 함수 단위 테스트 (vitest)
npm run typecheck  # tsc --noEmit
npm run build      # dist/ 생성 (esbuild 번들 + 아이콘 + manifest)
```

## 브라우저에 로드 (unpacked)

1. `npm run build`
2. `chrome://extensions` → 개발자 모드 ON → **압축해제된 확장 프로그램을 로드** → `extension/dist` 선택
3. 쿠팡(`/vp/products/...`) 또는 스마트스토어(`/{store}/products/...`) 상품 페이지에서 아이콘 클릭

로컬 ReviewBoost(`http://localhost:3001`)로 깔때기를 테스트하려면 `src/lib/config.ts`의 `RB_ORIGIN`을
`http://localhost:3001`로 바꿔 다시 빌드한다.

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
- 결과 페이지: `/extension-report` (익스텐션이 `externally_connectable`로 payload 전달 → 기존
  `AnalysisResults` 재사용 렌더)
- 개인정보처리방침(웹스토어 등록용): `/extension-privacy`
