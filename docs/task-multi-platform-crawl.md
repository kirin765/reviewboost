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
| **11번가** | ⚠️ 캡처 19개 엔드포인트 중 리뷰 XHR 0건 — 상품평 탭 트리거 미확인 | 실세션: 상품평 탭(li/[data-tab]) 클릭 → 리뷰 XHR 캡처. 페이지의 상품평 섹션은 클라이언트 렌더(`reviewDetailType`,`review-loading` DOM id 확인됨, 본문에 상품평 글자 자체 없음) |
| **SSG닷컴** | ⚠️ `www.ssg.com/item/ajaxItemQnaPageList.ssg?itemId=&siteNo=&page=` 캡처됨(질문 목록, 페이지 파라미터 확인). 시도한 상품 2건 모두 고객리뷰 0건이라 리뷰 목록 API 미캡처 | 리뷰>0 상품 1건 찾아 `ajax*Review*.ssg` 캡처 — QnA API와 동형(같은 파라미터 가족)일 가능성 높음. 상품 탐색: SSG 베스트/메인 링크에서 `dealItemView.ssg?itemId=` 위주 |
| **무신사** | ⚠️ 카테고리 API만 캡처(`api.musinsa.com/api2/dp/v1/...`, goodsNoList 실측: 4022315 등). `/goods/4022315` = 404 — 상품 URL 규약 재확인 필요 | 실세션: 실제 상품 페이지 URL 확보 → 리뷰 API(`api.musinsa.com/api2/goods/...` 추정) 캡처 |
| **오늘의집** | ❌ `store.ohou.se` Access Denied(헤드리스 차단) | 실세션(로그인 포함): `store.ohou.se/goods/{id}` 리뷰 XHR 캡처. 판매자 시스템은 오로라(`orora.ohou.se`), 후기 다운로드 공개 증거 0건 |
| **G마켓·옥션** | ❌ challenge 페이지(차단) | 실세션: `item.gmarket.co.kr/Item?goodscode=`(옥션 `itemno=`) 상품평 XHR 캡처 |
| **컬리** | 未시도(직매입 모델, 미확인) | 실세션: `www.kurly.com/goods/{id}` — 로그인 벽 확인 후 판정. 실패 시 '범위 제외'로 마킹 |

URL 추출기(레지스트리 `extension/src/lib/platforms.ts`)는 8개 전부 이미 존재 — 추정 표기는 `[추정]`으로 남아 있음. 실측 확정되면 표기 정정.

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