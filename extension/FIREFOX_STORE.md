# Firefox(AMO) 제출 패키지 — ReviewBoost 리뷰 수집기 (v1.6.1)

> **2026-10-25 등록정보 갱신:** 기존 1.6.1 패키지를 유지하고 별점만 리뷰 옵션·요금·개인정보 고지를 갱신했습니다. 접수 상태는 `STORE_SUBMISSION_2026-10-25.md`를 참조하세요.
업로드 파일: **`extension/reviewboost-extension-firefox-1.6.1.zip`** (manifest가 ZIP 루트)


## 빌드/패키징

```bash
cd extension
npm run package:firefox   # build:firefox + ZIP 생성
# → reviewboost-extension-firefox-1.6.1.zip
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

> 리뷰 수집·다운로드 중에도 사용량 확인 및 한도·오류 등 운영 이벤트가 전송될 수 있습니다. 리뷰 내용은 분석을 선택할 때 전송합니다.

## 제출 전 필수 선행

1. **ReviewBoost 배포 확인** — 심사관이 확장의 "ReviewBoost로 분석" 버튼과 개인정보처리방침 URL을 확인합니다:
   - `https://reviewboost.co.kr/extension-privacy` (개인정보처리방침)
   - `https://reviewboost.co.kr/api/extension/analyze` (분석 깔때기)
2. **개발자 등록** — https://addons.mozilla.org/developers/ 에 Mozilla 계정으로 로그인.

## 등록 정보 (복사용)

**제출 페이지**: https://addons.mozilla.org/developers/addon/submit/

**파일 선택**: `reviewboost-extension-firefox-1.6.1.zip`

**플랫폼**: `Firefox` (Android 는 대상 아님)

**카테고리**: `Shopping`

**언어**: 한국어 (`ko`)

**아이콘**: `extension/store-assets/store-icon-128.png`

**스크린샷**: `extension/store-assets/screenshot-1-export.png`, `-2-collect.png`, `-3-analyze.png`

**요약 (Summary, 250자 이내)**:
```
쿠팡·스마트스토어 등 12개 쇼핑몰 상품의 리뷰를 엑셀/CSV로 내려받고 ReviewBoost 무료 분석으로 연결합니다.
```

**상세 설명 (Description)**:
```
ReviewBoost는 쿠팡·스마트스토어 등 지원 쇼핑몰에서 상품 한 건의 공개 리뷰를 엑셀(.xlsx)이나 CSV로 저장하는 도구입니다. 정기 점검, 파일 보관, 보고서 작성에 활용할 수 있습니다.

사용 방법
1. 지원하는 상품 상세페이지를 열고 확장 아이콘을 누릅니다.
2. 원하는 개수를 정한 뒤 수집 버튼을 누릅니다. 별점만 있는 리뷰는 기본으로 포함하며 필요하면 제외할 수 있습니다.
3. 완료되면 파일을 내려받아 별점·내용·작성일 등을 확인합니다. 공개 화면에서 얻을 수 없는 항목은 비어 있을 수 있습니다.

무료 범위와 요금
무료로 하루 50개까지 수집할 수 있습니다. Extension 플랜은 월 4,900원 정기결제로 일일 한도가 없으며 Basic·Pro에도 포함됩니다. 모든 플랜은 한 번에 최대 2,000개까지이고, 실제 결과는 공개된 데이터와 사이트 접근 상태에 따라 달라집니다.
필요할 때 선택적으로 AI 분석에 연결할 수 있습니다. 분석 이용 한도는 별도입니다.

지원 사이트 전체 목록과 사용법: https://reviewboost.co.kr/extension
요금제: https://reviewboost.co.kr/pricing
문의: https://reviewboost.co.kr/support

개인정보
수집한 리뷰와 최근 작업 내역은 브라우저에 저장됩니다. 계정을 연결하면 인증 토큰으로 사용량을 확인하고 개수를 기록합니다. 비로그인 사용을 포함한 한도·오류 등의 운영 이벤트도 전송될 수 있습니다.
분석을 선택하면 해당 데이터가 서버로 전송됩니다. 문의를 보내면 입력한 이메일과 내용이 전달됩니다.
자세한 처리 방식: https://reviewboost.co.kr/extension-privacy

지원 쇼핑몰과 제휴하지 않은 독립 서비스입니다.
```

**개인정보처리방침 URL**: `https://reviewboost.co.kr/extension-privacy`

**Firefox 데이터 수집**: 위 `data_collection_permissions` 와 동일하게 응답
(웹 콘텐츠·웹 활동·인증 정보·개인 식별 정보).

## 심사 통과 기준 체크

- 정확성: 이름·설명·스크린샷이 기능과 일치 (12개 플랫폼).
- 사용성: 리뷰 수집·분석 결합은 니치, 스토어 내 중복 확장 없음.
- 보안·개인정보: `activeTab` + 단일 상품 + 선택 전송 + CS 문의 입력값 전송만 — 최소 권한. 각 쇼핑몰 호스트 권한은 공개 리뷰 읽기 목적만.
- 데이터 수집 동의: `data_collection_permissions.required` 4개 항목으로 선언, 개인정보처리방침과 일치.
- 수익 창출: 확장 내 광고 없음. 결제는 웹(Paddle)에서만.

## 제출 절차

1. https://addons.mozilla.org/developers/ Mozilla 로그인
2. **Submit a New Add-on** → `reviewboost-extension-firefox-1.6.1.zip` 업로드
3. 자동 검증(manifest/코드) 통과 확인 → 등록 정보 입력(위 복사용 값)
4. 데이터 수집 설문 응답 → **Submit Version**
5. 승인 시 AMO가 서명한 `.xpi` 로 배포되며, 임시 로드 대신 정식 설치 가능
