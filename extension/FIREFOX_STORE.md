# Firefox(AMO) 제출 패키지 — ReviewBoost 리뷰 수집기 (v1.5.1)

업로드 파일: **`extension/reviewboost-extension-firefox-1.5.1.zip`** (manifest가 ZIP 루트)

> ⚠️ AMO 제출은 Mozilla 계정 로그인 + (최초 1회) 개발자 등록이 필요해 **직접** 하셔야 합니다.

## 빌드/패키징

```bash
cd extension
npm run package:firefox   # build:firefox + ZIP 생성
# → reviewboost-extension-firefox-1.5.1.zip
```

## Chrome/Edge/웨일 빌드와 다른 점 (검수 대응)

| | Chrome/Edge/웨일 | Firefox |
|---|---|---|
| background | `service_worker` | `scripts` (MV3 event page) |
| 웹↔익스텐션 | `externally_connectable` | `content_scripts`의 `bridge.js` + `window.postMessage` |
| 최소 버전 | Chrome 110+ | **Firefox 140.0+** |

- **Firefox 는 `externally_connectable` 을 지원하지 않습니다** (Mozilla bug 1319168). 웹 페이지가
  `chrome.runtime.sendMessage` 를 직접 호출할 수 없어, reviewboost.co.kr 에 주입하는 `bridge.js`
  content script 가 페이지의 `window.postMessage` 요청을 background 로 중계합니다. `manifest.firefox.json`
  에는 `externally_connectable` 키가 **없습니다**.
- 브랜드스토어 리뷰 요청 캡처 훅은 `scripting.executeScript({world:"MAIN"})` 를 사용하며 Firefox 128+ 부터
  지원됩니다. 데이터 수집 동의 프레임워크는 Firefox 140+ 이므로 `strict_min_version` 을 `140.0` 으로 둡니다.
- AMO 정책상 신규 제출은 `browser_specific_settings.gecko.data_collection_permissions` 가 **필수**입니다
  (2025-11-03~). 아래 값을 선언했습니다.

```json
"data_collection_permissions": {
  "required": ["authenticationInfo", "personallyIdentifyingInfo", "websiteActivity", "websiteContent"]
}
```

| 항목 | 근거 |
|---|---|
| `websiteContent` | "ReviewBoost로 분석" 시 리뷰 텍스트를 `/api/extension/analyze` 로 전송 |
| `websiteActivity` | 같은 요청에 상품 URL(`productUrl`) 전송 |
| `authenticationInfo` | 계정 연결 시 익스텐션 토큰을 `storage.local` 에 저장하고 사용량 API 호출 |
| `personallyIdentifyingInfo` | CS 문의 탭에서 사용자가 입력한 답변 이메일을 `/api/support` 로 전송 |

> 엑셀/CSV 다운로드만 사용하면 어떤 데이터도 외부로 전송되지 않습니다.

## 제출 전 필수 선행

1. **ReviewBoost 배포 확인** — 심사관이 확장의 "ReviewBoost로 분석" 버튼과 개인정보처리방침 URL을 확인합니다:
   - `https://reviewboost.co.kr/extension-privacy` (개인정보처리방침)
   - `https://reviewboost.co.kr/api/extension/analyze` (분석 깔때기)
2. **개발자 등록** — https://addons.mozilla.org/developers/ 에 Mozilla 계정으로 로그인.

## 등록 정보 (복사용)

**제출 페이지**: https://addons.mozilla.org/developers/addon/submit/

**파일 선택**: `reviewboost-extension-firefox-1.5.1.zip`

**플랫폼**: `Firefox` (Android 는 대상 아님)

**카테고리**: `Shopping`

**언어**: 한국어 (`ko`)

**아이콘**: `extension/store-assets/store-icon-128.png`

**스크린샷**: `extension/store-assets/screenshot-1-export.png`, `-2-collect.png`, `-3-analyze.png`

**요약 (Summary, 250자 이내)**:
```
쿠팡·스마트스토어 등 10개 쇼핑몰 상품의 리뷰를 엑셀/CSV로 내려받고 ReviewBoost 무료 분석으로 연결합니다.
```

**상세 설명 (Description)**:
```
ReviewBoost 리뷰 수집기는 셀러가 지금 보고 있는 쿠팡·스마트스토어·무신사·11번가·SSG·G마켓·옥션·오늘의집·컬리·29CM 상품 한 건의 리뷰를 손쉽게 백업·분석하도록 돕는 도구입니다.

■ 이렇게 동작합니다
1) 지원 쇼핑몰의 상품 상세 페이지로 이동합니다.
2) 확장 프로그램 아이콘을 클릭하고 "리뷰 수집"을 누릅니다.
3) 수집된 리뷰를 엑셀(.xlsx)/CSV로 내려받거나, "ReviewBoost로 분석"으로 무료 분석 리포트를 받습니다.

■ 특징
- 브라우저 안에서 직접 동작: 사용자가 보는 화면의 공개 리뷰를 그대로 모읍니다.
- 10개 쇼핑몰 지원: 쿠팡·스마트스토어·무신사·29CM·G마켓·옥션·11번가·SSG닷컴·오늘의집·컬리.
- 엑셀·CSV 내보내기: 스마트스토어 판매자센터 공식 리뷰 엑셀과 같은 25열 폼으로 저장.
- 리뷰 이미지 URL 포함: 사진 리뷰의 이미지 주소도 함께 수집·내보냅니다.
- ReviewBoost 무료 분석 연동(선택): 감정·카테고리·부정 키워드·개선안 리포트.

■ 개인정보
- 수집은 사용자가 버튼을 눌렀을 때, 활성 탭의 단일 상품에서만 일어납니다.
- 엑셀/CSV 다운로드만 사용하면 어떤 데이터도 외부로 전송되지 않습니다.
- "ReviewBoost로 분석"을 누른 경우에만 리뷰 텍스트가 분석을 위해 ReviewBoost 서버로 전송됩니다.
- 자세한 내용: https://reviewboost.co.kr/extension-privacy

본 확장 프로그램은 셀러가 자신의 상품 리뷰를 백업·분석하도록 돕기 위한 것이며, 쿠팡·네이버·무신사·11번가·SSG·G마켓·옥션·오늘의집·컬리·29CM과 제휴 관계가 없습니다.
```

**개인정보처리방침 URL**: `https://reviewboost.co.kr/extension-privacy`

**Firefox 데이터 수집**: 위 `data_collection_permissions` 와 동일하게 응답
(웹 콘텐츠·웹 활동·인증 정보·개인 식별 정보).

## 심사 통과 기준 체크

- 정확성: 이름·설명·스크린샷이 기능과 일치 (10개 플랫폼).
- 사용성: 리뷰 수집·분석 결합은 니치, 스토어 내 중복 확장 없음.
- 보안·개인정보: `activeTab` + 단일 상품 + 선택 전송 + CS 문의 입력값 전송만 — 최소 권한. 각 쇼핑몰 호스트 권한은 공개 리뷰 읽기 목적만.
- 데이터 수집 동의: `data_collection_permissions.required` 4개 항목으로 선언, 개인정보처리방침과 일치.
- 수익 창출: 확장 내 광고 없음. 결제는 웹(Paddle)에서만.

## 제출 절차

1. https://addons.mozilla.org/developers/ Mozilla 로그인
2. **Submit a New Add-on** → `reviewboost-extension-firefox-1.5.1.zip` 업로드
3. 자동 검증(manifest/코드) 통과 확인 → 등록 정보 입력(위 복사용 값)
4. 데이터 수집 설문 응답 → **Submit Version**
5. 승인 시 AMO가 서명한 `.xpi` 로 배포되며, 임시 로드 대신 정식 설치 가능
