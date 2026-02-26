# ReviewBoost Deployment Checklist (Staging / Production)

## 1) 환경 분리 확인

- [ ] Vercel project/environment 분리
  - [ ] `main` → production
  - [ ] `staging` → preview/staging
- [ ] 도메인 분리
  - [ ] `staging.<your-domain>`
  - [ ] `<your-domain>`
- [ ] TLS 구성
- [ ] Secrets 분리 저장 (APP_ENV/API key/webhook secret)

## 2) 저장소/인증 분리

- [ ] Staging용 Supabase 연결 검증
- [ ] Production용 Supabase 연결 검증
- [ ] Staging/Production 키 교차 사용 여부 확인

## 3) 결제 분리

- [ ] Paddle `sandbox`(staging) / `live`(prod) 분리
- [ ] staging/prod webhook secret 분리
- [ ] 프로덕션 price-id가 staging에 미적용

## 4) CI/CD 게이트 (배포 전 필수)

- [ ] PR merge-blocking pass
  - [ ] `quality` (lint/typecheck/test)
  - [ ] `build`
  - [ ] `user-story-core`
- [ ] Main / Staging merge-blocking pass
  - [ ] `contracts`
  - [ ] `security-basic`
  - [ ] `integration-smoke`
- [ ] Optional checks (권장)
  - [ ] `security-deep` (수동/스케줄, non-blocking)
  - [ ] `e2e-smoke` (main/staging push 또는 수동)
  - [ ] `perf-smoke` (수동/스케줄)

### 실패 재현/추적

- [ ] CI 실패 job 이름 및 로그 링크 기록: `gh run view <run_id> --log`
- [ ] 재현 커맨드 첨부 (예: `npm run test:user-story:us-02`, `npm run ci:contracts`, `npm run ci:security`)
- [ ] 롤백 기준/범위 문서화

## 5) 배포 전 건강점검

- [ ] `/api/health` 응답이 200이고 `status: "ok"`인지 확인
- [ ] 배포 노트에 다음 항목 반영
  - [ ] user-story 상태 (`npm run test:user-story:smoke`)
  - [ ] 계약/보안/통합 smoke 결과

## 6) 사용자 스토리 기반 운영 점검 (릴리스 후)

- US-01 업로드/미리보기: 샘플 CSV 업로드/preview
- US-02 분석 실행 기본: plan/한도 동작 확인
- US-03 LLM 장애 시나리오: 로컬 fallback 검증
- US-04 저장 실패 회복: 분석 응답 유지 동작 확인
- US-05 결제 안정성: webhook 정상/중복 이벤트 처리 확인
- US-06 리포트 생성: `/api/report` 및 `/api/report/[id]` 응답 및 header 점검

## 7) 배포 후

- [ ] 배포 후 30분 내 에러율/지연률 모니터링
- [ ] 스테이징/프로덕션 공지 체계 확인
- [ ] 문제 발생 시 rollback/복구 경로 실행

