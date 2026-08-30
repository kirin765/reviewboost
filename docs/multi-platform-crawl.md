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
| 스마트스토어(기존) | 제공 | — (기존) | 기존 | — |
| 쿠팡(기존) | 미제공 | — (기존) | 기존 | ⚠️쿠팡 약관 09-03 자동수집 금지 |
| 11번가 | 미확인 | ⚠️ 상품평 탭 트리거 미확인(캡처 19개 엔드포인트 중 리뷰 없음) | 미착수 | 대상 탭(li/data-*) 실세션 확인 |
| SSG닷컴 | 미확인 | ⚠️ ajaxItemQnaPageList.ssg?itemId=&page= 캡처됨 — 리뷰 목록 API는 리뷰>0 상품에서 캡처 필요 | 미착수 | 리뷰 있는 상품 1건 캡처 |
| 무신사 | 미확인 | ⚠️ 카테고리 API만 캡처(goodsNoList 확보). goods 상세 페이지 404 — URL 규약 재확인 | 미착수 | 실상품 URL 1건 |
| 오늘의집 | 미확인 | ❌ Access Denied(헤드리스 차단) | 미착수 | 로그인/실브라우저 세션 |
| G마켓·옥션 | 미확인 | ❌ challenge 페이지(차단) | 미착수 | 실브라우저 세션 |
| 컬리 | 직매입·미확인 | 미시도 | 미착수 | 실브라우저 세션 |

## 배포 순서 (측정 보호)

확장 게이트 09-04(4주 정가 결제 0건 = 강등) 전에는 **스토어 제출 없음** —
제품을 측정 창 안에서 바꾸면 4주가 무엇을 잰 것인지 알 수 없다(가격·문구 동결과 같은 규율).
캡처 어댑터는 게이트 후 반영 + 크롬 웹스토어 재심사(manifest 변경)가 뒤따른다.
버전 1.4.1 → 배포 시점에 1.5.0, 이름/설명(현재 "쿠팡·스마트스토어")도 함께 갱신한다.

## 잔여 (각 15~30분, 브라우저 실세션 1회)

1. 11번가: 상품평 탭(li/tab) 실클릭 → 캡처된 XHR의 리뷰 목록 API → URL/스키마 → 어댑터.
2. SSG: 리뷰>0 상품에서 `ajax*Review*.ssg` 캡처(질문 목록 API와 동형일 가능성 높음).
3. 무신사: 실상품 goods URL 확보 → `api.musinsa.com/api2/...` 리뷰 엔드포인트 캡처.
4. 오늘의집·G마켓·컬리: 실세션(로그인 포함)에서 리뷰 API 캡처 가능성 판정.

## 리스크

- 각 플랫폼 이용약관의 자동 수집 금지 조항: 쿠팡(09-03 시행)과 달리 대부분 미확인 —
  어댑터 작성 전 URL별 조항 확인을 잔여 작업에 포함.
- 리뷰 이미지 CDN 기준 호스트(29CM `cdn.29cm.co.kr`)는 추정 — 이미지 깨지면 수정.