# Dashboard A안 a11y 강제 체크리스트

필수 게이트: 완료 기준(D4) 확인 전까지 체크 불가.

- [x] 메뉴 버튼/탭/버튼은 `button` 요소인지 확인
- [x] Drawer 토글/닫기 버튼이 `aria-label`과 `aria-expanded`를 제공하는지 확인
- [x] Drawer 링크가 `aside`/`nav`/`aria-current`를 통해 시맨틱 구조를 갖추는지 확인
- [x] `DashboardShell` 닫힘/열림 상태 전환 시 포커스가 유효하게 이동하는지 확인
- [ ] 셀 모달/복사 버튼이 키보드 Enter/Space 및 `aria-label`, `aria-modal`을 충족하는지 확인
- [ ] 실패/빈 상태 텍스트가 비의미적 아이콘 없이 문장으로 노출되는지 확인
- [ ] 색상 대비(텍스트/배지/버튼)가 WCAG AA 기준 대략 충족하는지 확인
