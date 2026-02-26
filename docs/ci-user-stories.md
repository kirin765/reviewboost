# CI 사용자 스토리 매핑 (v1)

목표는 API 계약/분석/결제/리포트 핵심 시나리오를 사용자 동작 단위로 묶어, 장애 전파 방향을 고정하고 회귀 검출 속도를 높이는 것입니다.

## 사용자 스토리 목록

### US-01 업로드/미리보기 (merge-blocking)
- 코드영역: `/api/preview`, `csv`
- 스크립트: `npm run test:user-story:us-01`
- 핵심 테스트
  - `src/app/api/preview/route.test.ts`
  - `src/lib/csv.test.ts`
- 커버포인트
  - 업로드 검증(타입/크기/MIME/인코딩)
  - delimiter/헤더 추론 일관성
  - preview와 analyze에서 공통 파싱 규칙 오류 메시지 정합

### US-02 분석 실행 기본 (merge-blocking)
- 코드영역: `/api/analyze`, `analysis_pipeline`
- 스크립트: `npm run test:user-story:us-02`
- 핵심 테스트
  - `src/app/api/analyze/route.test.ts`
  - `src/lib/analysis_pipeline.test.ts`
  - `src/lib/analysis_pipeline.perf.test.ts`(스모크 경계)
- 커버포인트
  - 월간 제한(회원/비회원)
  - 분석 결과 반환 구조 정합성
  - 빈 데이터/NaN/무한대 방어

### US-03 LLM 장애 폴백 (merge-blocking)
- 코드영역: `openai_classify`, `openai_suggestions`
- 스크립트: `npm run test:user-story:us-03`
- 핵심 테스트
  - `src/lib/openai_classify.test.ts`
  - `src/lib/openai_suggestions.test.ts`
  - `src/lib/analysis_pipeline.test.ts`
- 커버포인트
  - 타임아웃/파싱 실패 fallback
  - `MAX_LLM_REVIEWS`, timeout 상수 적용
  - 휴리스틱 품질 저하 상태 노출

### US-04 저장 실패 회복 (merge-blocking)
- 코드영역: `analysis_repository`, `/api/analyze`
- 스크립트: `npm run test:user-story:us-04`
- 핵심 테스트
  - `src/app/api/analyze/route.test.ts`
- 커버포인트
  - 저장 실패에도 200 분석 응답 반환
  - `meta.storageAttempted/storageError/storageStep` 노출

### US-05 결제 웹훅 안정성 (non-blocking)
- 코드영역: `/api/billing/webhook`, `billing`
- 스크립트: `npm run test:user-story:us-05`
- 핵심 테스트
  - `src/app/api/billing/webhook/route.test.ts`
  - `src/app/api/billing/checkout/route.test.ts`
  - `src/lib/billing.test.ts`
  - `src/lib/paddle.test.ts`
- 커버포인트
  - 서명/secret 누락
  - 중복 이벤트 및 customer_id 누락
  - 기간 필드 variant/재처리 정책

### US-06 리포트 생성/다운로드 (merge-blocking)
- 코드영역: `/api/report`, `/api/report/[id]`, `report_pdfkit`
- 스크립트: `npm run test:user-story:us-06`
- 핵심 테스트
  - `src/app/api/report/route.test.ts`
  - `src/app/api/report/[id]/route.test.ts`
  - `src/lib/contracts.test.ts`
- 커버포인트
  - PDF 렌더 성공/실패 header contract
  - 실패 코드/에러 헤더 일관성

## CI 매핑

- 전체 smoke: `npm run test:user-story:smoke` (US-01~US-06 병렬 병합 실행)
- 매핑 검증: `npm run ci:user-story-matrix`
- 스토리 실행 스크립트: `npm run test:user-story:us-01` ~ `npm run test:user-story:us-06`

## 보완 필요 항목(리서치 반영)

- 일반적으로 많이 수행하는 CI 항목을 추가로 문서화
  - 계약 보강(schmea smoke): `npm run ci:contracts`
  - 보안/취약점/시크릿 검사: `npm run ci:security`
  - 통합 smoke(리포트 경로): `npm run ci:report-smoke`
  - 성능 smoke: `npm run ci:perf-smoke`
  - 선택 E2E smoke: `npm run test:e2e:smoke`
- 이 항목은 기본 계약 유지, PR 병합 여부 및 운영 이벤트에서 점진적으로 강화한다.
