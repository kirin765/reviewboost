# 다중 플랫폼 리뷰 수집 — 추가 대상과 상태 (2026-08-30)

> 서빙: reviewboost 확장의 크롤링·다운로드 범위 확장. 선정 근거(뇌 리드저):
> `reports/platform-review-download-map-2026-08-30.md` — "판매자에게 리뷰 다운로드를
> 제공하지 않는(또는 미확인) 플랫폼" 필터. 제공 플랫폼(스마트스토어·카페24 자사몰)은
> 확장의 순수 가치가 없고, 07-28 글루맥스 이탈(판매자센터 직접 다운로드 선택)이 이를 실증했다.
> 실측 원자료: brain `raw/review-platform-capture-2026-08-30/*.json` (헤드리스 Chromium 캡처).

## 패턴 (스마트스토어/쿠팡 참조)

플랫폼당 4개 파일 + 라우팅 + manifest:

| 파일 | 역할 | 참조 구현 |
|---|---|---|
| `extension/src/lib/{platform}.ts` | URL/스키마 파서·API URL 빌더 (순수 함수) | `lib/coupang.ts`·`lib/29cm.ts` |
| `extension/src/lib/normalize.ts` + `normalize{P}Review` | raw → RawReview 필드 매핑 (방어적) | `normalizeCoupangReview` |
| `extension/src/content/collect-{platform}.ts` | paginate 루프 + fetch (페이지 origin + 쿠키) | `collect-coupang.ts` |
| `extension/src/content/index.ts` | detect() 라우팅 + 제네릭 dispatch | — |
| `public/manifest.json` | content_scripts matches + host_permissions (+ 크로스오리진 API 호스트) | — |

핵심 제약: 리뷰 API가 페이지와 다른 오리진이면(29CM `review-api.29cm.co.kr`)
host_permissions + 페이지가 직접 호출하므로 성립하는 CORS가 필수.

## 대상별 상태

| 플랫폼 | 판매자 다운로드 | 리뷰 API 실측 | 어댑터 | 배포 차단 |
|---|---|---|---|---|
| 29CM | 미확인(공개 가이드 0건) | ✅ `review-api.29cm.co.kr/api/v4/reviews?itemId=&page=0&size=&sort=BEST` (0-based) | ✅ 구현·테스트 | — |
| 11번가 | 미확인 | ✅ **(2026-08-31)** `GET www.11st.co.kr/products/{prdNo}/review-list?pageNo=1-based&pageSize=10` (HTML, iframe review-frame 은 fetch 차단) | ✅ 구현·테스트 | — |
| SSG닷컴 | 미확인 | ✅ **(2026-08-31)** `GET www.ssg.com/item/ajaxItemCommentList.ssg?itemId=&siteNo=&page=1-based&pageSize=10` (HTML + JSON-LD) | ✅ 구현·테스트 | — |
| 무신사 | 미확인 | ✅ **(2026-08-31)** `GET goods.musinsa.com/api2/review/v1/view/list?page=0-based&goodsNo=` — 상품 URL `/products/{no}` | ✅ 구현·테스트 | — |
| 오늘의집 | 미확인 | ✅ **(2026-08-31, CDP)** `GET store.ohou.se/api/goods/reviews?page=1-based&per=5&productionId=` | ✅ 구현·테스트 | ⚠️약관 제29조(영리 이용 금지 — 최강) |
| G마켓·옥션 | 미확인 | ✅ G마켓 **(2026-08-31)** `POST item.gmarket.co.kr/Review/Text` body `goodsCode=&pageNo=` — ✅ 옥션 **(2026-08-31)** `POST itempage3.auction.co.kr/WebService/ReviewService.asmx/GetReviewList` body JSON `{"itemNo":"(문자접두+숫자)","filterParam":"","sort":"popular","pageIndex":1-based}` → `{"d":"<html>"}` (동일 그룹이지만 API 별개) | ✅ 구현·테스트 (G마켓+v1, 옥션+v1) | — |
| 컬리 | 직매입·미확인 | ✅ **(2026-08-31)** `GET api.kurly.com/product-review/v4/contents-products/{no}/reviews?size=&after={cursor}` (커서 기반) | ✅ 구현·테스트 | — |
| 스마트스토어(기존) | 제공 | — (기존) | 기존 | — |
| 쿠팡(기존) | 미제공 | — (기존) | 기존 | ⚠️쿠팡 약관 09-03 자동수집 금지 |

## 배포 순서 (측정 보호)

확장 게이트 09-04(4주 정가 결제 0건 = 강등) 전에는 **스토어 제출 없음** —
제품을 측정 창 안에서 바꾸면 4주가 무엇을 잰 것인지 알 수 없다(가격·문구 동결과 같은 규율).
캡처 어댑터는 게이트 후 반영 + 크롬 웹스토어 재심사(manifest 변경)가 뒤따른다.
버전 1.4.1 → 배포 시점에 1.5.0, 이름/설명(현재 "쿠팡·스마트스토어")도 함께 갱신한다.

## 잔여 (각 15~30분, 브라우저 실세션 1회)

**✅ 전부 완료 (2026-08-31)** — 실측·어댑터·테스트 (재현: brain `tmp/capture-cdp.mjs`, 원자료 `raw/review-platform-capture-2026-08-30/*-live.json`).

**✅ 잔여 후속 2건도 완료 (2026-08-31 후속 세션)**:
1. **옥션 어댑터** — G마켓과 같은 eBay Korea 그룹이지만 **API 별개 실측**: `POST itempage3.auction.co.kr/WebService/ReviewService.asmx/GetReviewList` (body JSON `itemNo/filterParam/sort/pageIndex`, 응답 `{"d":"<html>"}`). itemno 는 **문자접두+숫자**(`F361333759`) → `platforms.ts` 추출기 버그 수정. 상세: `docs/task-multi-platform-crawl.md` 2026-08-31 후속 항목.
2. **무신사 리뷰 이미지 CDN host 확정** — 페이지 렌더가 `https://image.msscdn.net/thumbnails/data/estimate/...?w=260` 로 실제 요청 10건 캡처 → **`image.msscdn.net` [실측]** (base+상대경로 로직 유지, 주석 정정).
3. 11st 포토리뷰(`photo-list`)/옵션 필드 — 텍스트가 우선이라 보류 (변동 없음).

## 리스크 (플랫폼별 약관·robots 실측 — 2026-08-30, 원문: brain `raw/review-platform-tos-scan-2026-08-30.md`)

| 플랫폼 | 자동 수집·이용 금지 (실측) | 정도 |
|---|---|---|
| 오늘의집 | 약관 제29조 2항(파트너 공지): 리뷰 등 회원 콘텐츠, **사전 승낙 없이 영리 목적 이용·제3자 이용 금지** | 이용 자체 금지 — 최강 |
| G마켓 | 구매회원 약관 부정행위 3호: **영리 목적으로 사이트 정보 수집·이용 금지** | 영리 목적 수집 금지 |
| SSG닷컴 | 약관: 닷컴 IP 귀속 정보의 영리 목적 이용 금지 | 리뷰 적용 모호 |
| 무신사 | robots `*: Disallow /` (AI 봇 8종만 허용, 2026-05-13) | 기술적 전면 차단 |
| 11번가 | robots `*: Disallow /` (검색엔진만 허용) | 기술적 전면 차단 |
| 29CM | 약관 본문 미확보 · robots `*: Allow /` | 미확인 |
| 옥션 | 동일 그룹 정책(G마켓 페이지로 확인) | — |
| 컬리 | 미확보 · robots 기본 허용 | 미확인 |

결론: **자동 크롤링 확장이라는 제품 형태는 대상 대부분에서 정책 리스크를 앉는다**(쿠팡 09-03 자동수집 금지와 동일 구조). 수동(사용자 주도·동일 세션)이 회색지대를 가장 작게 만들지만 오늘의집류 "이용 금지" 조항은 피하지 못한다(⚠️가설). **사용자 확정(2026-08-30): 리스크 수용하고 다중 플랫폼 진행** ("upon risk, go multi platform"). 09-04 게이트 판정 후 최종 포함 여부 재확인.