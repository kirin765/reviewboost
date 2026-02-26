# CI/CD Guardrails for ReviewBoost

## 1) 게이트 정책

- Merge-blocking은 분할된 job 레이어로 강제한다.
- 현재 기본 게이트:
  - `quality`
  - `build`
  - `user-story-core`
- Main / Staging 병합/푸시 추가 merge-blocking:
  - `contracts`
  - `security-basic`
  - `integration-smoke`

## 2) CI Job Mapping (현재 .github/workflows/ci.yml 기준)

- PR (`pull_request` to `main`/`staging`):
  - `quality` → `build` → `user-story-core`
  - 실패 시 Merge-blocking 차단
- Main / Staging (`push` to `main`/`staging`) 또는 수동/예약 실행:
  - `quality` → `build` → `contracts` / `security-basic` / `integration-smoke`
  - 계약·보안·통합 smoke는 기본 push에서도 수행
- Non-blocking:
  - `security-deep` (`workflow_dispatch`, `schedule`) `continue-on-error: true`
  - `e2e-smoke` (`workflow_dispatch`, `schedule`, `main/staging push`) `continue-on-error: true`
  - `perf-smoke` (`workflow_dispatch`, `schedule`) `continue-on-error` by design

## 3) 브랜치별 필수 체크 요건

- PR 대상 브랜치: `main`, `staging`
  - 필수: `quality`, `build`, `user-story-core`
- Main / Staging 대상 브랜치
  - 필수: `quality`, `build`, `user-story-core`, `contracts`, `security-basic`, `integration-smoke`
- 권장: PR branch protection에서 필수 job 결과만 병합 게이트에 연결

## 4) 사용자 스토리 기반 방어 레이어

- `scripts/ci/user-story-matrix.ts`로 다음을 분기 실행
  - Merge-blocking: US-01, US-02, US-03, US-04, US-06
  - Non-blocking: US-05 (결제 webhook 보강)
- 실행 명령:
  - 전체: `npm run test:user-story:smoke`
  - 단건: `npm run test:user-story:us-01` … `npm run test:user-story:us-06`

## 5) 보편적 CI 항목(기본 게이트 외 보강)

아래 항목은 기존 `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`를 유지하면서 보강한다.

- 계약 보강:
  - `npm run ci:contracts` (`scripts/ci/contracts.ts`)
- 의존성/보안 보강:
  - `npm run ci:security` (`scripts/ci/security.ts`)
- 통합/회귀 smoke:
  - `npm run ci:report-smoke`
- 성능 smoke:
  - `npm run ci:perf-smoke`
- E2E smoke:
  - `npm run test:e2e:smoke` (PR은 기본 미실행, main/staging & 수동에서 확장 실행)

## 6) 운영 추적 규칙

실패 항목이 생긴 경우 PR/릴리즈 노트와 이슈에는 최소 다음을 첨부한다.

- 실패 job/스텝
- 실패 요약
- 원인 로그 링크: `gh run view <run_id> --log`
- 재현 명령
- 되감기(rollback) 필요 여부

## 7) 검증 로그 정합성

- 계약/보안/성능/통합 smoke는 실행 로그를 `실패 코드 + 샘플 출력` 포함 형식으로 남긴다.
- 스크립트 레벨 검증 실패 시 exit code 0 회피 없이 명시적 종료를 사용한다.
