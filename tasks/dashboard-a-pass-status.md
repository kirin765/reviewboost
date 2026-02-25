# ReviewBoost Dashboard A안 진행 상태

## 공통 상태
- [x] D1: 구현 완료(코드/구조 변경 반영)
- [x] D2: 독립 컴포넌트 렌더링 테스트 통과(RTL/Playwright)
- [ ] D3: 시각/상호작용 회귀(스토리 기반 상태) 통과 (Storybook webpack5 빌드 에러: SB_BUILDER-WEBPACK5_0002 `tap`, 보류)
- [ ] D4: a11y 체크리스트 통과
- [x] D5: lint/typecheck/test/build 통과
- [ ] D6: 수동 체크리스트/스크린샷

## Phase 1 (1차 생성)
- [x] P1D1: `/dashboard` 레이아웃을 Drawer + 탭 A안으로 전환
- [x] P1D2: 대시보드 경로에서 상단 floating 네비 제거 (`.dashboardMode`에서 `.topNav` hidden)
- [x] P1D3: 분석 파이프라인(업로드/미리보기/분석/결과) 동작 유지 (`src/app/dashboard/page.test.tsx` 통과)
- [x] P1D4: Storybook 스토리 등록(최소 1개/섹션)
- [x] P1D5: 컴포넌트 상호작용 테스트 추가(Playwright 또는 RTL)
- [ ] P1D6: a11y 체크리스트 항목 충족(실행 대기)
- [x] P1D7: lint/typecheck/test/build 통과(검증 완료)

## Phase 2 (정리 pass)
- [x] P2D1: `AnalysisResults`/`analysis/[id]` 결과 렌더링 중복 제거 (`AnalysisResultDigest` 공용 컴포넌트화)
- [x] P2D2: 반복 컴포넌트 분해/재사용 컴포넌트화 완료 (`AnalysisListSection` + `AnalysisKpiGrid` + `AnalysisResultDigest`)
- [ ] P2D3: 스타일 토큰 정합화 및 인라인 스타일 축소 (핵심 영역 위주)
- [x] P2D4: 독립 스토리 추가(최소 2개 추가) 및 interaction state 스텝 정리 (`AnalysisResultDigest`, `DashboardShell`, `CsvPreview`)
- [ ] P2D5: a11y 점검 항목 보강(키보드/포커스/시맨틱)
- [x] P2D6: lint/typecheck/test/build 재통과

## a11y 체크리스트
- [x] 키보드 접근(버튼/메뉴/탭/닫기/복사/모달): Drawer 토글·Tab·모달 닫기 Escape 지원
- [x] 포커스 가시성: 네비게이션 버튼, 토글 버튼 focus-visible 스타일 존재
- [ ] 시맨틱 구조(nav/main/aside/button/dialog/aria attrs): 검토 필요(aria-live 사용 점검 포함)
- [ ] 색상 대비(텍스트·배지·액션): 검토 필요
- [ ] 실패/빈 상태 메시지 텍스트성: 점검 필요
- [ ] 다이얼로그/토스트(`aria-modal`,`aria-live`): 점검 필요

## 수동/스크린샷 체크리스트
- [ ] /dashboard 와 /dashboard/history에서 drawer 오픈/접힘 상태 전환 체크
- [ ] 분석 탭 이동, 셀 모달 열기/닫기, 복사 버튼 동작
- [ ] 결과 뷰에서 우선순위 카드/긴급 리뷰 카드 렌더 상태 확인
- [ ] 최소 1회 스크린샷 저장 후 이전본 대비 시각 비교 (가능 시)
