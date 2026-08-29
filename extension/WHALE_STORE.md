# 웨일 스토어 제출 패키지 — ReviewBoost 리뷰 수집기 (v1.3.0)

업로드 파일: **`extension/reviewboost-extension-whale-1.3.0.zip`** (manifest가 ZIP 루트, v1.3.0)

> ⚠️ 제출은 네이버 아이디 로그인 + (최초 1회) 개발자 등록이 필요해 **직접** 하셔야 합니다. 아래 문구를 그대로 붙여넣으면 됩니다.

## 제출 전 필수 선행

1. **ReviewBoost 배포 확인** — 심사관이 확장의 "ReviewBoost로 분석" 버튼과 개인정보처리방침 URL을 확인합니다:
   - `https://reviewboost.co.kr/extension-privacy` (개인정보처리방침)
   - `https://reviewboost.co.kr/api/extension/analyze` (분석 깔때기)
2. **개발자 등록** — https://store.whale.naver.com/ 에 네이버 아이디로 로그인 → 계정 정보 > 개발자 → 개발자 등록 (무료, 1회).
3. **제출 페이지** — https://store.whale.naver.com/developers → 확장앱 관리 → 새로운 확장앱 추가.

## 등록 정보 (복사용)

**파일 선택**: `reviewboost-extension-whale-1.3.0.zip`

**언어**: 한국어

**앱 아이콘**: `extension/store-assets/store-icon-128.png` (128×128)

**스크린샷** (1280×800, 최대 4장 — 3장 준비됨):
- `extension/store-assets/screenshot-1-export.png` (리뷰 엑셀 내보내기)
- `extension/store-assets/screenshot-2-collect.png` (리뷰 수집)
- `extension/store-assets/screenshot-3-analyze.png` (분석 리포트)

**상세 설명** (평문만 — HTML·마크다운 불가):
```
ReviewBoost 리뷰 수집기는 셀러가 지금 보고 있는 쿠팡 또는 스마트스토어 상품 한 건의 리뷰를 손쉽게 백업·분석하도록 돕는 도구입니다.

■ 이렇게 동작합니다
1) 쿠팡 또는 스마트스토어 상품 상세 페이지로 이동합니다.
2) 확장 프로그램 아이콘을 클릭하고 "리뷰 수집"을 누릅니다.
3) 수집된 리뷰를 엑셀(.xlsx)/CSV로 내려받거나, "ReviewBoost로 분석"으로 무료 분석 리포트를 받습니다.

■ 특징
- 브라우저 안에서 직접 동작: 사용자가 보는 화면의 공개 리뷰를 그대로 모읍니다.
- 엑셀·CSV 내보내기: 별점·내용·작성일이 정리된 파일로 저장.
- ReviewBoost 무료 분석 연동(선택): 감정·카테고리·부정 키워드·개선안 리포트.

■ 개인정보
- 수집은 사용자가 버튼을 눌렀을 때, 활성 탭의 단일 상품에서만 일어납니다.
- 엑셀/CSV 다운로드만 사용하면 어떤 데이터도 외부로 전송되지 않습니다.
- "ReviewBoost로 분석"을 누른 경우에만 리뷰 텍스트가 분석을 위해 ReviewBoost 서버로 전송됩니다.
- 자세한 내용: https://reviewboost.co.kr/extension-privacy

본 확장 프로그램은 셀러가 자신의 상품 리뷰를 백업·분석하도록 돕기 위한 것이며, 쿠팡·네이버와 제휴 관계가 없습니다.
```

**분류**: `쇼핑` (확장앱 분류 목록에서 가장 가까운 항목)

**공개 설정**: 공개

**성인용 콘텐츠**: 포함되어 있지 않음

## 심사 통과 기준 체크 (웨일 심사 가이드 대조)

- 정확성: 이름·설명·스크린샷이 기능과 일치 — 크롬 웹스토어 통과본과 동일 문구라 문제 없음.
- 사용성: 스토어에 동일/유사 확장과 겹치지 않음(리뷰 수집·분석 결합은 니치).
- 보안·개인정보: `activeTab`+단일 상품+선택 전송만 — 최소 권한 원칙 충족.
- 수익 창출: 확장 내 광고 없음. 결제는 웹(Paddle)에서만 — 확장 내 수익 취득 없음.
- 네이버 서비스: 스마트스토어 데이터를 읽지만 "제휴 없음" 명시, 네이버 공식 앱 사칭 없음.

## 제출 절차

1. https://store.whale.naver.com/ 네이버 로그인
2. (최초 1회) 계정 정보 > 개발자 → 개발자 등록
3. https://store.whale.naver.com/developers → 확장앱 관리 → 새로운 확장앱 추가
4. ZIP 업로드 → 위 정보 입력 → 미리보기 확인 → **리뷰 요청**

## 웨일 스토어 측정 관련 (원장 규칙)

- 웨일 설치 수는 웨일 개발자 대시보드가 분모를 준다. (원장 `reports/shelf-scan-2026-08-12.md` "측정 가능성" 절)
- 09-04 게이트(크롬 확장 정가 결제) 판정 시 **웨일 유입은 분리 집계** — 웨일 설치로 난 결제를 크롬 분자에 섞지 않는다. 게이트 기간 크롬 외 표면이니 게이트는 크롬 퍼널만 본다.
- UA 감지(Whale/Edg/Chrome) source 태깅은 별도 작업 — 이번 제출과 무관하게 원장에 제안만 기록됨.
