# Microsoft Edge Add-ons 제출 패키지 — ReviewBoost 리뷰 수집기 (v1.5.0)

업로드 파일: **`extension/reviewboost-extension-edge-1.5.0.zip`** (manifest가 ZIP 루트, v1.5.0)

> ⚠️ 제출은 Microsoft 계정 + Partner Center 개발자 등록이 필요해 **직접** 하셔야 합니다. 등록은 무료입니다.
> 시작: https://partner.microsoft.com/dashboard/microsoftedge/public/login

> 🆕 v1.5.0 (2026-08-31) — 기존 v1.3.0 항목이 스토어에 있으므로 **"새 확장 만들기"가 아니라 기존 항목의 업데이트 제출**로 진행합니다.
> 변경 내용: **8개 쇼핑몰 추가 지원(총 10개)** — 무신사·29CM·G마켓·옥션·11번가·SSG닷컴·오늘의집·컬리 + G마켓/무신사 사이트 변경 대응. 상세는 `extension/CHANGELOG.md` 참고.

> ⏰ **09-04 게이트 규칙**: `docs/NEXT_SESSION.md` §9에 따라 다중 플랫폼(1.5.0) **스토어 제출은 09-04 게이트 이후**로 예정되어 있습니다 (측정 보호). 게이트 전 제출 시 크롬 퍼널 측정이 오염될 수 있습니다 — 제출 시점은 해당 문서를 확인하고 결정하세요.

## 제출 전 필수 선행

1. **ReviewBoost 배포 확인** — 심사관이 "ReviewBoost로 분석" 버튼과 개인정보처리방침 URL을 확인합니다:
   - `https://reviewboost.co.kr/extension-privacy` (200 확인됨)
   - `https://reviewboost.co.kr/api/extension/analyze` (라우트 정상 확인됨)
2. **개발자 등록** — Partner Center에서 Microsoft Edge program 개발자 등록 (무료, 1회).
3. **제출 페이지** — Partner Center → Edge → 기존 항목(ReviewBoost 리뷰 수집기) → 업데이트 제출 → ZIP 업로드.
   (아직 항목이 없으면 Create new extension → ZIP 업로드)

## 1. Availability (가용성)

- **Visibility**: Public
- **Markets**: 기본(전체) 또는 한국 우선 — 선택은 자유. 한국 셀러 대상이므로 전체로 두어도 무방.

## 2. Properties (속성)

- **Category**: Shopping (또는 Productivity — 셀러 도구 성격에 가장 가까운 것)
- **Website**: `https://reviewboost.co.kr`
- **Support contact detail**: `https://reviewboost.co.kr/support`
- **Mature content**: 체크 안 함

## 3. Privacy (개인정보)

- **Single purpose**:
```
사용자가 현재 보고 있는 지원 쇼핑몰(쿠팡·스마트스토어·무신사·29CM·G마켓·옥션·11번가·SSG닷컴·오늘의집·컬리) 상품 한 건의 공개 리뷰를 수집해 엑셀/CSV로 내보내거나, 사용자가 선택하면 ReviewBoost 무료 분석으로 전송하는 한 가지 목적만 수행합니다.
```
- **Permission justification**:
  - `activeTab`: 사용자가 아이콘을 클릭한 활성 상품 탭에서만 리뷰를 읽기 위해 사용합니다.
  - `storage`: 분석 결과를 결과 페이지로 전달하기 위해 임시 보관하는 데 사용합니다.
  - `scripting`: 활성 상품 페이지에서 리뷰 데이터를 추출하기 위해 사용합니다.
  - 호스트 권한 `*://*.coupang.com/*`: 쿠팡 상품 페이지의 공개 리뷰를 읽기 위해 필요합니다.
  - 호스트 권한 `*://smartstore.naver.com/*`, `*://brand.naver.com/*`: 스마트스토어/브랜드스토어 상품 페이지의 공개 리뷰를 읽기 위해 필요합니다.
  - 호스트 권한 `*://www.musinsa.com/*`, `*://goods.musinsa.com/*`: 무신사 상품 페이지의 공개 리뷰(리뷰 API 포함)를 읽기 위해 필요합니다.
  - 호스트 권한 `*://www.29cm.co.kr/*`, `*://review-api.29cm.co.kr/*`: 29CM 상품 페이지의 공개 리뷰(리뷰 API 포함)를 읽기 위해 필요합니다.
  - 호스트 권한 `*://www.11st.co.kr/*`: 11번가 상품 페이지의 공개 리뷰를 읽기 위해 필요합니다.
  - 호스트 권한 `*://www.ssg.com/*`: SSG닷컴 상품 페이지의 공개 리뷰를 읽기 위해 필요합니다.
  - 호스트 권한 `*://store.ohou.se/*`: 오늘의집 상품 페이지의 공개 리뷰를 읽기 위해 필요합니다.
  - 호스트 권한 `*://item.gmarket.co.kr/*`: G마켓 상품 페이지의 공개 리뷰를 읽기 위해 필요합니다.
  - 호스트 권한 `*://*.auction.co.kr/*`: 옥션 상품 페이지의 공개 리뷰를 읽기 위해 필요합니다.
  - 호스트 권한 `*://www.kurly.com/*`, `*://api.kurly.com/*`: 컬리 상품 페이지의 공개 리뷰(리뷰 API 포함)를 읽기 위해 필요합니다.
  - 호스트 권한 `*://reviewboost.co.kr/*`: "ReviewBoost로 분석" 요청과 팝업의 **CS 문의 폼 전송**을 위해 필요합니다.
- **Remote code**: No, I am not using remote code (MV3 — 원격 코드 불가, 패키지 내부 로직만)
- **Data usage** — 수집 데이터 유형 체크: **웹사이트 콘텐츠**(지원 쇼핑몰 상품 리뷰 텍스트·별점·작성일). 작성자 ID는 마스킹된 형태(예: dj****)만 보입니다.
  - 인증 체크: 데이터 제3자 판매 안 함 · 단일 목적 외 사용 안 함 · 신용도/대출 목적 사용 안 함
  - 데이터 전송 고지: "ReviewBoost로 분석"을 누른 경우에 한해 리뷰 텍스트를 ReviewBoost 서버로 전송해 분석 리포트를 생성합니다. **CS 문의 탭에서 문의를 보낼 때는 입력한 이메일·문의 유형·내용만** ReviewBoost 서버로 전송됩니다.
- **Privacy policy URL**: `https://reviewboost.co.kr/extension-privacy`

## 4. Store listings — 한국어 (ko)

- **Extension name**: manifest에서 자동 (ReviewBoost 리뷰 수집기 — 쿠팡·스마트스토어·무신사·11번가 등 리뷰 엑셀 내보내기)
- **Description** (최소 250자 — 아래는 700자대, 충족):
```
ReviewBoost 리뷰 수집기는 셀러가 지금 보고 있는 쿠팡·스마트스토어·무신사·11번가·SSG·G마켓·옥션·오늘의집·컬리·29CM 상품 한 건의 리뷰를 손쉽게 백업·분석하도록 돕는 도구입니다.

■ 이렇게 동작합니다
1) 지원 쇼핑몰의 상품 상세 페이지로 이동합니다.
2) 확장 프로그램 아이콘을 클릭하고 "리뷰 수집"을 누릅니다.
3) 수집된 리뷰를 엑셀(.xlsx)/CSV로 내려받거나, "ReviewBoost로 분석"으로 무료 분석 리포트를 받습니다.

■ 특징
- 브라우저 안에서 직접 동작: 사용자가 보는 화면의 공개 리뷰를 그대로 모읍니다.
- 10개 쇼핑몰 지원: 쿠팡·스마트스토어·무신사·29CM·G마켓·옥션·11번가·SSG닷컴·오늘의집·컬리.
- 엑셀·CSV 내보내기: 스마트스토어 판매자센터 공식 리뷰 엑셀과 같은 25열 폼(별점·제목·리뷰내용·작성자·작성일·도움됨·포토/영상 등)으로 저장.
- 리뷰 이미지 URL 포함: 사진 리뷰의 이미지 주소도 함께 수집·내보냅니다.
- ReviewBoost 무료 분석 연동(선택): 감정·카테고리·부정 키워드·개선안 리포트.

■ 개인정보
- 수집은 사용자가 버튼을 눌렀을 때, 활성 탭의 단일 상품에서만 일어납니다.
- 엑셀/CSV 다운로드만 사용하면 어떤 데이터도 외부로 전송되지 않습니다.
- "ReviewBoost로 분석"을 누른 경우에만 리뷰 텍스트가 분석을 위해 ReviewBoost 서버로 전송됩니다.
- 자세한 내용: https://reviewboost.co.kr/extension-privacy

본 확장 프로그램은 셀러가 자신의 상품 리뷰를 백업·분석하도록 돕기 위한 것이며, 쿠팡·네이버·무신사·11번가·SSG·G마켓·옥션·오늘의집·컬리·29CM과 제휴 관계가 없습니다.
```
- **Extension logo**: `extension/store-assets/store-icon-128.png` (128×128 — 최소 규격 충족)
- **Small promotional tile**: `extension/store-assets/promo-tile-440x280.png` (440×280 정확 일치)
- **Large promotional tile**: `extension/store-assets/marquee-1400x560.png` (1400×560 정확 일치)
- **Screenshots** (최대 6장, 1280×800 규격 — 3장):
  - `extension/store-assets/screenshot-1-export.png`
  - `extension/store-assets/screenshot-2-collect.png`
  - `extension/store-assets/screenshot-3-analyze.png`
- **Search terms** (최대 7개·각 30자 — 7개):
```
쿠팡리뷰, 스마트스토어리뷰, 무신사리뷰, 리뷰수집, 리뷰분석, 리뷰엑셀, 리뷰다운로드
```

## 5. Certification notes (심사 노트)

```
Test flow:
1. Visit a product page on any supported mall — e.g. Coupang (https://www.coupang.com/vp/products/...), SmartStore (https://smartstore.naver.com/.../products/...), Musinsa (https://www.musinsa.com/products/...), 11st (https://www.11st.co.kr/products/...), SSG (https://www.ssg.com/item/itemView.ssg?...), Gmarket (https://item.gmarket.co.kr/Item?...), Auction (https://*.auction.co.kr/DetailView.aspx?...), Ohou (https://store.ohou.se/goods/...), Kurly (https://www.kurly.com/goods/...), 29CM (https://www.29cm.co.kr/products/...).
2. Click the extension icon and press "리뷰 수집" (Collect reviews).
3. The extension shows collected reviews (rating, masked author id, date). Use "엑셀 다운로드" to export an .xlsx/.csv file (SmartStore seller-center official 25-column format including photo/video image URLs). No login required.
4. Optionally press "ReviewBoost로 분석" to open https://reviewboost.co.kr with the review data; a free analysis report is generated (requires signing in to reviewboost.co.kr; the analyze API is at https://reviewboost.co.kr/api/extension/analyze).
5. The "CS 문의" tab lets the user submit an inquiry (type, email, message) directly to ReviewBoost support; only that input is sent.
Privacy policy: https://reviewboost.co.kr/extension-privacy
No test account required for the extension itself.
```

## 제출 절차 요약

1. Partner Center 로그인 → Edge → 기존 항목(ReviewBoost 리뷰 수집기) 선택 (없으면 Create new extension)
2. `reviewboost-extension-edge-1.5.0.zip` 업로드 (manifest 루트 — 검증 통과 확인)
3. Availability → Properties → Privacy → Store listings(ko) 순서로 위 내용 입력 (기존 등록정보는 그대로 두고 변경된 개인정보 항목·설명만 갱신해도 됨)
4. Certification notes 입력 → **Publish** 제출 — v1.4.1(또는 이전) 심사가 진행 중이면 완료 후 제출
5. 인증 최대 7영업일, 통과 시 "In the Store" → Edge Add-ons 노출 (기존 사용자는 자동 업데이트)

## 원장 규칙 (웨일과 동일)

- Edge 설치 수 = Partner Center Analytics 분모(일별 설치·노출·주간 유저).
- 09-04 게이트(크롬 확장 정가 결제) 판정 시 **Edge·웨일 유입은 분리 집계** — 게이트는 크롬 퍼널만 본다. UA 감지(Whale/Edg/Chrome) source 태깅은 별도 작업으로 원장에 제안만 기록.
- **09-04 게이트 전 스토어 제출 금지** (`docs/NEXT_SESSION.md` §9) — 1.5.0 제출은 게이트 이후.