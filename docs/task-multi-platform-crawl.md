# 태스크: 다중 플랫폼 리뷰 수집 확장 — 잔여 7개 (2026-08-30 손떠넘김)

> 이 파일은 새 세션 전용. 이 세션의 문맥을 못 보므로 아래 내용만으로 작업 가능해야 한다.
> 지난 작업: 29CM 어댑터 완성(커밋 36af7a29). 이 태스크 = **나머지 7개 플랫폼의 리뷰 API 캡처 → 어댑터 구현**.
> 실측 원자료·리드저는 brain 저장소에 있다: `/Users/kiwankim/projects/misc/brain` (아래 경로 그대로 참조).

---

## 1. 목표 (완료 정의)

검색 1개 플랫폼마다:

1. **리뷰 API 실측** — 상품 페이지에서 리뷰 XHR 1건 캡처(URL·요청 파라미터·응답 스키마·페이지네이션). 헤드리스 실패 시 실브라우저 세션(사용자 브라우저 연결). 실측 결과를 brain `raw/review-platform-capture-2026-08-30/<platform>.json`에 저장.
2. **어댑터 구현** — 아래 "3. 패턴"의 4개 파일(+테스트). `npx vitest run` 전체 통과 + `npx tsc --noEmit` 클린.
3. **실측 표기 규율** — API 경로는 실측/추정을 파일에 명시. 차단·실패는 가설로 승격 금지.

캡처 후 **스토어 제출 금지**(아래 "5. 제약").

## 2. 배경 (왜 이 플랫폼들인가)

"판매자에게 리뷰 다운로드를 제공하는가" 지도: `/Users/kiwankim/projects/misc/brain/reports/platform-review-download-map-2026-08-30.md`
- 제공(확장 불필요, 제외): 네이버 스마트스토어(25컬럼 xlsx 실파일)·카페24 자사몰(통합 엑셀).
- 미제공/미확인(추가 대상 8개): 무신사·29CM·**G마켓·옥션·11번가·SSG·오늘의집·컬리** — 판매자 다운로드 공개 증거 0건.

결정 기록: `/Users/kiwankim/projects/misc/brain/wiki/decision-log.md` 2026-08-30 행.
플랫폼별 세부 근거: `/Users/kiwankim/projects/misc/brain/raw/review-download-map-fetches-2026-08-30.md`(기본) · `raw/review-download-map-verticals-fetches-2026-08-30.md`(버티컬).

## 3. 패턴 (기존 구현 참조 파일)

| 역할 | 이 태스크에서 만들 파일 | 참조(완성) |
|---|---|---|
| URL/스키마 파서·API URL 빌더 (순수 함수) | `extension/src/lib/{platform}.ts` | `lib/coupang.ts` · `lib/29cm.ts` |
| raw → RawReview 매핑 (방어적) | `lib/normalize.ts`에 `normalize{P}Review` 추가 | `normalize29cmReview` |
| 페이지네이션 fetch (페이지 origin+쿠키) | `extension/src/content/collect-{platform}.ts` | `content/collect-coupang.ts` |
| 라우팅 | `content/index.ts` detect()+dispatch | 이미 추가됨(dispatch는 플랫폼별로 확장) |
| manifest | `public/manifest.json` matches·host_permissions | 29CM 예제(크로스오리진 API 호스트 추가) |

공통 룰:
- **paginate 는 1-based**(`lib/collector.ts`) — API가 0-based면(29CM) `page-1`로 변환.
- content script fetch 는 페이지 origin + `credentials:"include"` — 페이지가 직접 호출하는 API면 CORS 성립.
- 리뷰 API가 페이지와 다른 오리진이면(29CM `review-api.29cm.co.kr`) host_permissions 에 추가.

## 4. 플랫폼별 작업표 (실측 상태 2026-08-30)

캡처 결과 원자료: `/Users/kiwankim/projects/misc/brain/raw/review-platform-capture-2026-08-30/*.json` (헤드리스 Chromium, playwright)
캡처 스크립트(재사용 가능): `/Users/kiwankim/projects/misc/brain/tmp/capture-platform-review.mjs`(리뷰 URL 필터) · `capture2.mjs`(전체 JSON) · `capture3.mjs`(탭 클릭 강화). 실행은 brain 디렉토리에서(node 모듈 해석 → `/Users/kiwankim/node_modules`).

| 플랫폼 | 상태 | 남은 일 |
|---|---|---|
| **29CM** | ✅ 완료(어댑터·테스트) | — |
| **11번가** | ✅ **실측·어댑터 완료 (2026-08-31)** — CDP 실세션: `GET /products/{prdNo}/review-list?pageNo={1-based}&pageSize=10` (HTML 프래그먼트, `li.review_list_element`). 리뷰 iframe(`review-frame`)은 fetch에서 빈 셸 — review-list XHR 사용(실측) | — |
| **SSG닷컴** | ✅ **실측·어댑터 완료 (2026-08-31)** — `GET /item/ajaxItemCommentList.ssg?itemId=&siteNo=&page={1-based}&pageSize=10...` (`li.rvw_expansion_panel.v2`, 실측 3페이지 각 10건) | — |
| **무신사** | ✅ **실측·어댑터 완료 (2026-08-31)** — 상품 URL은 **`/products/{no}`**(구 `/goods/{no}` 404). 리뷰 `GET goods.musinsa.com/api2/review/v1/view/list?page={0-based}&pageSize=10&goodsNo=` (JSON) | 이미지 CDN 호스트(`image.msscdn.net`)는 [추정] — 재확인 시 health |
| **오늘의집** | ✅ **실측·어댑터 완료 (2026-08-31)** — CDP 통과(헤드리스 Access Denied 해소). `GET store.ohou.se/api/goods/reviews?page={1-based}&per=5&productionId=` (리뷰 8,022건 제품 검증) | — |
| **G마켓·옥션** | ✅ **실측·어댑터 완료 (2026-08-31)** — G마켓 `POST /Item/Review/Text` body `goodsCode=&pageNo=` (HTML, `td.comment-content`). **옥션 추가 실측**: `POST itempage3.auction.co.kr/WebService/ReviewService.asmx/GetReviewList` body JSON `{"itemNo":"(문자접두+숫자)","filterParam":"","sort":"popular","pageIndex":1-based}` → `{"d":"<html>"}` (JSON, `ul.list__review > li.list-item`) — 동일 그룹이지만 API 별개. itemno 는 문자접두+숫자(`F361333759`) | — |
| **컬리** | ✅ **실측·어댑터 완료 (2026-08-31)** — `GET api.kurly.com/product-review/v4/contents-products/{no}/reviews?size=10&after={cursor}` (커서 기반, `0_0` 종료) | — |

어댑터 구현: `extension/src/lib/{11st,ssg,musinsa,ohou,gmarket,kurly}.ts` + `normalize{P}` + `content/collect-{p}.ts` + `content/index.ts` 라우팅 + `public/manifest.json`(host_permissions·content_scripts) + 테스트 6개. **extension vitest 126 통과 / tsc 클린 / build OK (2026-08-31).** 단, 스토어 제출은 09-04 게이트 후 (현재 웹스토어 라이브 = v1.4.1 유지).

### 2026-08-31 후속 — 잔여 2건 완료

- **옥션 어댑터 (9개째)**: 실측 `POST itempage3.auction.co.kr/WebService/ReviewService.asmx/GetReviewList` (요청 postData 3건 + 응답 전체 저장: brain `raw/.../auction-review-C337580252.json`, 요약 `auction-live.json`). 검증 상품 itemno `C337580252` (미샤), 페이지당 19건 x 3페이지, 총 328페이지 표기. 
  - filterParam: 페이지 실요청 `.useruniqueid-{cguid}` — **빈 문자열로 200 실측**(누락 시 500) → 어댑터는 `filterParam:""`.
  - itemno 는 문자접두+숫자 → `platforms.ts` auction extractor `itemno=(\d+)` 버그 수정(`[A-Za-z]?\d+`).
  - 이미지: `_thum.jpg` → 정본 `.jpg` + https 승격 실측 로드 OK (`bampic.auction.co.kr`).
  - `lib/auction.ts` + `normalizeAuctionReview` + `content/collect-auction.ts` + `content/index.ts` dispatch + `public/manifest.json`(`*.auction.co.kr` host_permissions·`DetailView.aspx` matches) + `test/auction.test.ts`. **vitest 132(was 126) / tsc / build 클린.**
- **무신사 리뷰 이미지 CDN host 확정**: 상품 페이지 렌더가 `https://image.msscdn.net/thumbnails/data/estimate/...?w=260` 으로 실제 요청 10건 캡처 (brain `raw/.../musinsa-estimate-requests.json`) — `lib/musinsa.ts` `MUSINSA_IMAGE_BASE` 주석 [추정]→[실측] 정정. base + 상대경로(원본 크기) 어댑터 로직은 유지.

URL 추출기(레지스트리 `extension/src/lib/platforms.ts`)는 8개 전부 실측 확정 — 추정 잔여는 29CM 이미지 CDN(`cdn.29cm.co.kr`) 뿐.

## 5. 제약 (반드시 지킴)

1. **스토어 제출 금지 — brain 게이트(09-04) 전** : reviewboost 확장 게이트 = 배포 08-07+28일(09-04), 4주 정가 결제 0건 = 무료 옵션 강등. 측정 창 안 제품 변경은 4주가 무엇을 잰 것인지 알 수 없다(가격·문구 동결과 같은 규율; brain `wiki/projects.md` ReviewBoost 트랙). 어댑터 코드·테스트는 자유, 제출(manifest 포함 새 버전)은 게이트 후.
2. **각 플랫폼 약관의 자동 수집 금지 조항 확인** — 쿠팡은 2026-09-03 시행 명문화(자동 프로그램 수집 금지, brain `raw/cafe24-gap-demand-research-2026-08-30/notes2-coupang-2026-08-30.md`). 무신사·29CM·SSG 등 어댑터 확정 전 약관 확인을 작업에 포함.
3. 배포 시점 TODO(게이트 후): 버전 1.4.1 → 1.5.0, manifest 이름/설명에서 "쿠팡·스마트스토어" 문구 갱신, 웹스토어 재심사.

## 6. 명령

```bash
cd /Users/kiwankim/projects/saas/reviewboost/extension
npx vitest run          # 전체 테스트(현재 94 통과)
npx tsc --noEmit        # typecheck
```

캡처 후 evidence 저장:
```bash
# brain 저장소로 이동 후
node tmp/capture3.mjs <platform> /Users/kiwankim/projects/misc/brain/raw/review-platform-capture-2026-08-30 "<url>" "<탭텍스트>"
```

## 7. 작업 마감 시 기록할 곳

- 이 파일(플랫폼별 상태 갱신) + brain `wiki/log.md`(query 엔트리) + brain `wiki/decision-log.md`(플랫폼 확정 시 행) + brain `reports/platform-review-download-map-2026-08-30.md`(so-what 갱신).
- 실측 원자료는 brain `raw/review-platform-capture-2026-08-30/`(불변, pre-commit 훅).

### 2026-08-31 세션 결과 (6개 플랫폼 실측 + 어댑터 완료)

- 캡처 원자료: brain `raw/review-platform-capture-2026-08-30/{11st,ssg,musinsa,ohou,gmarket,kurly}-live.json` (기존 헤드리스 파일은 손대지 않음 — 추가만)
- 검증 사용 상품: 11st 문화상품권/버거킹쿠폰(13건) · SSG 다이슨 에어랩(3페이지 검증) · 무신사 6254168(21건) · 오늘의집 인덕션(8,022건) · G마켓 크리넥스(85건/6페이지) · 컬리 장어솥밥키트(697건)
- 재현 스크립트: brain `tmp/capture-cdp.mjs`(CDP 9222 실세션 캡처) — `node tmp/capture-cdp.mjs <platform> <outDir>`
- 어댑터(+테스트): `extension/src/lib/{11st,ssg,musinsa,ohou,gmarket,kurly}.ts`, `content/collect-{p}.ts`, `content/index.ts`, `public/manifest.json`, `test/*.test.ts` — vitest 126(was 94) / tsc / build 클린
- ⚠️ HTML 파싱 테스트(11st/ssg/gmarket) 위해 `jsdom` devDependency 추가됨 (extension/package.json)
- 미확정: 무신사 리뷰 이미지 CDN host(`image.msscdn.net` [추정]), G마켓/옥션 공통 패턴(옥션 미실측), 11st 옵션·포토리뷰(photo-list) 미수집

### 2026-08-31 후속(잔여 완료)

- **옥션 어댑터** (위 본문) + 원자료: brain `raw/.../{auction-live,auction-review-C337580252,auction-fetch-probe,auction-https-img-probe}.json`
- **무신사 이미지 CDN 실측 확정** (`image.msscdn.net`) + 원자료: brain `raw/.../{musinsa-img-cdn-confirmed,musinsa-img-cdn-confirm,musinsa-estimate-requests}.json`
- 문서 갱신: `docs/NEXT_SESSION.md` §9 · `docs/multi-platform-crawl.md` 잔여 · brain `wiki/log.md` · `wiki/decision-log.md`