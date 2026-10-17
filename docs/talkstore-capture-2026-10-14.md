# 톡스토어 리뷰 API 실측 기록 (2026-10-14)

> 대상: ReviewBoost 리뷰 수집기 톡스토어 어댑터 (`extension/src/lib/talkstore.ts`, `collect-talkstore.ts`).
> 방식: 사용자 Chrome(CDP 9222) + 프로브 스크립트(/tmp/kakao-probe-*.cjs)로 실상품 페이지·네트워크 캡처,
> 동일 파라미터를 curl/Node fetch 로 재확인. [실측]=직접 확인.

## 리뷰 API [실측]

```
GET https://store.kakao.com/a/f-m/{store}/products/{productId}/reviews
    ?page={0-based}&size={n}&productDetailReviewFilter=ALL|IMAGE
    &productDetailReviewSort=RECOMMENDATION_SCORE|CREATED_AT_LATEST&mask=false
```

- 페이지(store.kakao.com)와 **같은 오리진** → 콘텐츠 스크립트 fetch 로 수집, 별도 크로스오리진 권한 불필요. 비로그인 curl 에서도 200(공개).
- `size`: 10/20/30/50/100 모두 허용(실측). 어댑터는 50 사용.
- `page`: 0-based. 마지막 페이지까지 전부 노출 — 표시 7,943개 상품에서 page=794(size 10)까지,
  깊은 페이지도 200. 쿠팡식 중간 절단(1,500) 없음.
- 정렬 값은 UI 드롭다운 클릭으로 캡처: `RECOMMENDATION_SCORE`(추천순, 사이트 기본), `CREATED_AT_LATEST`(최신순).
  추정값(RECENT/LATEST 등)은 400.
- 필터 값: `ALL`(전체 리뷰), `IMAGE`(사진 리뷰, 표시 총수와 일치: 707/7,943). `mask=true/false` 는 아바타만 다르고 닉네임은 항상 마스킹.

## 응답 스키마 [실측]

```json
{ "result": true, "data": { "contents": [ {
  "id": "6a98...", "createdAt": "20260902233346", "content": "...",
  "ratingView": { "productStarRating": 4, "deliveryStarRating": 4 },
  "writer": { "displayName": "이두*" }, "likeView": { "likeCount": 0 },
  "imageViews": [ { "originUrl": "https://st.kakaocdn.net/...jpg", ... } ],
  "productStatus": "OUT_OF_STOCK", "optionDisplayable": true, "optionText": "..."
} ], "last": true, "page": 0, "totalCount": 2, "timestamp": 1791957420000 } }
```

- `last`: boolean 마지막 페이지. `totalCount`: 표시 총수(‘리뷰 7,943’과 일치).
- **별점은 4점 척도** — UI 문구 "만족도: 4점 만점", 분포 라벨 매우 만족해요(4)/만족해요(3)/아쉬워요(2)/매우 아쉬워요(1).
  어댑터는 공용 5점 척도로 의미 보존 변환: 4→5, 3→4, 2→2, 1→1.
- `createdAt` 은 KST `YYYYMMDDHHmmss` — epoch 로 오파싱하지 않도록 전용 변환 사용.

## 판매자 리뷰 다운로드 [문서 기준 없음]

- 카카오비즈니스 가이드(kakaobusiness.gitbook.io) 상품/리뷰관리: 리뷰 목록·정렬·상세·답글·추천리뷰만 안내, 리뷰 엑셀 다운로드 언급 없음
  (주문·통계·도착산간 리스트는 엑셀 다운로드 명시). 2018 판매자센터 메뉴얼도 동일. → 확장의 대상 조건(판매자 다운로드 미제공) 충족.
- robots.txt: `User-agent: * → Disallow: /` (Googlebot/Yeti 외 전면 차단, AI 봇 11종 명시 차단) — 무신사·11번가와 같은 등급.
  상세 약관(톡스토어 이용약관) 자동수집 조항은 미확인 — 배포 전 별도 확인 필요.

## 어댑터 라이브 검증 [2026-10-14]

- 동원샘물 무라벨 2L×36 외(표시 7,943) 에서 실제 어댑터로 1,200건 수집 (24회 요청, 약 14초):
  전건 본문 보유, 별점 {1,2,4,5}(4점→5점 변환), KST→ISO 변환·중복 제거·진행률/요약 정상.
- 단위 테스트: `extension/test/talkstore.test.ts` (30건) + platforms 레지스트리 케이스.
