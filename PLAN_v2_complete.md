# ReviewBoost v2 통합 구현 계획

> 이 문서는 Claude Code에게 전달하는 구현 지시서입니다.
> 기존 코드베이스(`CLAUDE.md` 참고)를 기반으로 **Part A (UI/UX 리디자인)** → **Part B (신규 기능 5종)** 순서로 구현해주세요.

---

## 공통 원칙

- 기존 아키텍처(Next.js 14 App Router, TypeScript strict, Supabase, OpenAI)를 그대로 유지
- 기존 graceful degradation 패턴 준수: 외부 의존성 없이도 동작해야 함
- UI 텍스트는 모두 **한국어**
- 새로운 타입은 `src/lib/types.ts`에 추가
- 새로운 분석 로직은 `src/lib/` 아래에 별도 파일로 분리
- 기존 `POST /api/analyze` 응답 구조(`AnalysisOutput`)를 확장하되, 하위 호환성 유지 (새 필드는 optional)
- PDF 리포트에도 새 섹션을 반영

---

# Part A: UI/UX 리디자인

## 디자인 방향

현재 사이트는 프로토타입 느낌이 강하다. **"데이터 기반 전문 분석 도구"**라는 신뢰감을 주기 위해 아래 방향으로 리디자인한다.

### 톤 & 무드
- **전문적이고 신뢰감 있는 분석 대시보드** 느낌 (Mixpanel, Amplitude, 토스 비즈니스 참고)
- 깔끔하되 밋밋하지 않은, 데이터 중심 SaaS의 정석적 디자인
- 차분한 다크 네이비 + 화이트 + 포인트 블루/그린 조합

### 디자인 토큰 (CSS Variables 정의)

`src/app/globals.css` 또는 별도 `src/styles/tokens.css`에 아래 변수를 정의하고, 전체 사이트에서 일관되게 사용:

```css
:root {
  /* 브랜드 컬러 */
  --color-primary: #2563EB;        /* 메인 블루 — CTA, 링크 */
  --color-primary-hover: #1D4ED8;
  --color-primary-light: #EFF6FF;  /* 블루 배경 tint */
  
  --color-success: #059669;        /* 긍정/완료 — 긍정 키워드, 체크 */
  --color-warning: #D97706;        /* 주의 — 모니터링 */
  --color-danger: #DC2626;         /* 위험/긴급 — 부정, 긴급 대응 */
  --color-danger-light: #FEF2F2;
  
  /* 중립 컬러 */
  --color-bg: #F8FAFC;             /* 페이지 배경 — 현재 베이지를 쿨 그레이로 교체 */
  --color-surface: #FFFFFF;        /* 카드 배경 */
  --color-surface-elevated: #FFFFFF;
  --color-border: #E2E8F0;
  --color-border-light: #F1F5F9;
  
  /* 텍스트 */
  --color-text-primary: #0F172A;   /* 제목, 강조 */
  --color-text-secondary: #475569; /* 본문 */
  --color-text-muted: #94A3B8;     /* 보조 텍스트 */
  
  /* 타이포그래피 */
  --font-sans: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  
  /* 사이즈 */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  
  /* 그림자 — 입체감 있는 카드 */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04);
}
```

### 폰트 설정
- **Pretendard** 웹폰트 적용 (CDN: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.min.css`)
- 한글 가독성 최적화된 폰트로, 현재 시스템 폰트 대비 전문성이 크게 올라감
- `layout.tsx`의 `<head>`에 CDN link 추가

---

## UI-1: 글로벌 — 네비게이션 바 리디자인

### 현재 문제
- "리뷰 기반 매출 개선 리포트 MVP" 서브타이틀에 **MVP 표기**가 있어 신뢰도 하락
- 내비게이션이 밋밋한 텍스트 나열 → 어떤 페이지에 있는지 알 수 없음
- 로고가 텍스트 전용으로 브랜딩이 약함

### 변경사항

1. **서브타이틀 변경**: "리뷰 기반 매출 개선 리포트 MVP" → "리뷰 기반 매출 개선 리포트" (MVP 제거)
2. **로고 영역 개선**:
   - "ReviewBoost" 텍스트 왼쪽에 간단한 아이콘(차트 상승 모양) 추가 — SVG inline 또는 emoji `📊` 활용
   - 서브타이틀 폰트 크기 줄이고 `color: var(--color-text-muted)`
3. **네비게이션 활성 상태**:
   - 현재 페이지에 해당하는 메뉴에 `font-weight: 600` + `color: var(--color-primary)` + 하단 2px 보더
   - 비활성 메뉴는 `color: var(--color-text-secondary)`
   - hover 시 `color: var(--color-primary)` 트랜지션 (150ms)
4. **네비 바 스타일**:
   - 배경: `var(--color-surface)` (현재 반투명 베이지 → 화이트)
   - 하단에 `border-bottom: 1px solid var(--color-border)` 추가
   - `position: sticky; top: 0; z-index: 50;` — 스크롤 시 고정
   - `max-width: 1200px; margin: 0 auto;` — 중앙 정렬 + 최대 너비 제한
5. **로그인 버튼 스타일 변경**:
   - "로그인(선택)" → "로그인" (선택 제거, 불필요한 정보)
   - 네비 우측에 아웃라인 버튼 형태: `border: 1px solid var(--color-primary); border-radius: var(--radius-sm); padding: 6px 16px;`
   - 로그인 상태일 때: 이메일 또는 아바타 아이콘 표시

### 적용 파일
- 네비게이션 컴포넌트 (현재 레이아웃에 포함된 부분)
- `src/app/layout.tsx` 또는 별도 `src/components/Nav.tsx`

---

## UI-2: 글로벌 — 페이지 레이아웃 & 카드 시스템

### 현재 문제
- 페이지 배경이 베이지/크림 톤 → 따뜻하지만 분석 도구에는 부적합, 전문성 떨어짐
- 카드(흰 박스)에 그림자가 거의 없어 플랫하고 계층감이 없음
- 카드 간 간격이 불규칙
- 전체 너비가 과도하게 넓음 (가독성 저하)

### 변경사항

1. **배경색 변경**: 현재 베이지 계열 → `var(--color-bg)` (#F8FAFC, 쿨 그레이)
2. **카드 공통 스타일**:
   ```css
   .card {
     background: var(--color-surface);
     border: 1px solid var(--color-border);
     border-radius: var(--radius-lg);
     box-shadow: var(--shadow-sm);
     padding: 24px;
     transition: box-shadow 0.2s;
   }
   .card:hover {
     box-shadow: var(--shadow-md); /* 인터랙티브한 카드만 적용 */
   }
   ```
3. **레이아웃 최대 너비**: `max-width: 960px` (현재보다 좁힘, 데이터 밀도 적절히 유지)
4. **카드 간 간격 통일**: `gap: 20px` (현재 불규칙 → 일정하게)
5. **섹션 제목 스타일 통일**:
   - `font-size: 18px; font-weight: 700; color: var(--color-text-primary);`
   - 제목 왼쪽에 컬러 바 (4px width, border-left) 추가로 시각적 앵커
   - 예: 부정 관련 섹션은 `border-left: 4px solid var(--color-danger)`, 긍정은 `var(--color-success)`

---

## UI-3: 대시보드 — 핵심 지표 카드 리디자인

### 현재 문제
- 3개 지표(리뷰 수, 부정비율, 우선순위점수)가 단순 텍스트로 나열 → 데이터 시각화 느낌 없음
- 각 지표의 의미/맥락이 불명확
- "14%" 같은 숫자가 좋은 건지 나쁜 건지 직관적으로 알 수 없음

### 변경사항

1. **3-컬럼 카드 그리드** (모바일: 세로 스택):
   ```
   ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
   │  📋 리뷰 수   │ │  ⚠️ 부정 비율  │ │  🎯 우선순위   │
   │     120      │ │    14%       │ │    23.7      │
   │  전체 분석 건수 │ │  ▓▓░░░ 양호   │ │  ▓▓▓░░ 주의   │
   └──────────────┘ └──────────────┘ └──────────────┘
   ```

2. **각 카드에 상태 색상 반영**:
   - 부정 비율: 10% 미만 초록, 10~20% 주황, 20% 이상 빨강 → 카드 상단에 해당 색상 2px 보더
   - 우선순위 점수: 0~33 초록, 34~66 주황, 67~100 빨강

3. **미니 프로그레스 바 또는 도넛 인디케이터** 추가:
   - 부정 비율 카드: 얇은 프로그레스 바로 비율 시각화
   - 우선순위 카드: 0~100 스케일 위 현재 위치 표시

4. **보조 텍스트** 추가:
   - 부정 비율 14% → 아래에 "양호한 수준입니다" / "개선이 필요합니다" 등 한 줄 해석
   - 숫자의 의미를 즉시 이해 가능하도록

---

## UI-4: 대시보드 — 데이터 테이블 스타일 개선

### 현재 문제
- "부정 키워드 TOP10", "문제 카테고리" 테이블이 기본 HTML 테이블 스타일
- 행 구분이 약하고, 숫자(건수)와 라벨(긍정/부정)이 시각적으로 구분 안 됨
- 가로 바(bar) 없이 숫자만 표시 → 크기 비교가 직관적이지 않음

### 변경사항

1. **가로 바 차트 추가**:
   - 각 키워드/카테고리 행에 배경으로 가로 바(proportional bar) 표시
   - 최대값 기준 너비 비율로 계산
   - 부정 키워드: `var(--color-danger)` 10% opacity 배경 바
   - 카테고리: 각 카테고리 고유 색상

2. **행 스타일**:
   - 짝수/홀수 행 교대 배경 (zebra striping): `nth-child(even) { background: var(--color-bg) }`
   - hover 시 행 하이라이트: `background: var(--color-primary-light)`
   - 행 높이: 최소 44px (터치 타겟)

3. **뱃지 스타일 태그**:
   - "긍정" "부정" 라벨을 둥근 뱃지로: `border-radius: 9999px; padding: 2px 10px; font-size: 12px;`
   - 긍정: 초록 배경, 부정: 빨간 배경, 각각 `background: color-mix(in srgb, var(--color-success) 15%, white)`

4. **순위 표시**: 1~3위에 메달 색상 또는 볼드 처리로 시각적 강조

---

## UI-5: 대시보드 — 업로드 영역 리디자인

### 현재 문제
- 파일 업로드 영역이 일반 input 필드 → 드래그&드롭 지원 여부 불명확
- "분석 시작" 버튼이 작고 눈에 띄지 않음
- CSV 미리보기 테이블이 카드 안에 갑자기 나타남 (단계 구분 없음)

### 변경사항

1. **드래그&드롭 업로드 존**:
   ```
   ┌─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┐
   │   📁 CSV 파일을 여기에 끌어놓거나    │
   │      [파일 선택] 버튼 클릭          │
   │   지원: .csv (최대 6MB)            │
   └─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┘
   ```
   - 점선 보더 (`border: 2px dashed var(--color-border)`)
   - 파일 드래그 중: 보더 색상 `var(--color-primary)` + 배경 `var(--color-primary-light)` 전환
   - 업로드 완료 시: 파일명 + 파일 크기 + ✅ 표시

2. **분석 단계 표시 (Stepper)**:
   - 상단에 3단계 표시: `① 파일 업로드` → `② 컬럼 매핑` → `③ 분석 결과`
   - 현재 단계 강조, 완료 단계 체크마크
   - 각 단계 사이 연결선

3. **분석 시작 버튼**:
   - 풀와이드 또는 넉넉한 크기
   - `background: var(--color-primary); color: white; font-size: 16px; font-weight: 600; padding: 12px 32px; border-radius: var(--radius-md);`
   - hover: `background: var(--color-primary-hover)` + 약간의 translateY(-1px) + shadow 증가
   - 분석 중: 버튼 내 스피너 애니메이션 + "분석 중..." 텍스트

---

## UI-6: 대시보드 — 개선 제안 텍스트 영역

### 현재 문제
- "개선 제안: 상세페이지 문구", "개선 제안: CS 응대/FAQ"가 긴 텍스트 덩어리
- 가독성이 낮고 어디서부터 읽어야 할지 모름
- 복사하기 어려움

### 변경사항
> 참고: 이 섹션은 Part B 기능 5(체크리스트)로 대체될 예정이지만, 체크리스트 구현 전까지의 중간 개선안

1. **카드 분리**: 상세페이지 / CS 응대 / FAQ를 **탭(tab)** 또는 **개별 카드**로 분리
2. **각 제안 항목에 복사 버튼** 추가 (클립보드 복사 → 토스트 알림 "복사되었습니다")
3. **제안 텍스트 내 키워드 하이라이트**: 실제 리뷰 데이터에서 추출한 키워드를 볼드 + 배경 처리

---

## UI-7: 로그인/회원가입 페이지

### 현재 문제
- 폼만 덩그러니 있어 브랜딩/가치 전달이 없음
- "저장된 리포트를 쓰려면 계정을 만들면 됩니다" → 약한 동기 부여
- 회원가입의 혜택이 명확하지 않음
- 전체적으로 너무 심플해서 신뢰감이 부족

### 변경사항

1. **2-컬럼 레이아웃** (데스크탑, 모바일은 폼만 표시):
   ```
   ┌─────────────────────┬────────────────────┐
   │                     │                    │
   │   왼쪽: 가치 제안     │  오른쪽: 폼          │
   │                     │                    │
   │   ✅ 분석 결과 저장    │  이메일             │
   │   ✅ 히스토리 관리     │  비밀번호            │
   │   ✅ PDF 리포트       │  [회원가입]          │
   │   ✅ 팀 공유 (Pro)    │                    │
   │                     │                    │
   │   "1,200개 리뷰에서   │                    │
   │    매출 개선점을       │                    │
   │    자동으로 찾아드려요" │                    │
   │                     │                    │
   └─────────────────────┴────────────────────┘
   ```
   - 왼쪽 영역: `background: var(--color-primary)` 또는 그라디언트 + 화이트 텍스트
   - 혜택 리스트 아이콘 + 핵심 문구

2. **폼 개선**:
   - input 필드: `border-radius: var(--radius-md); height: 48px; font-size: 15px;`
   - focus 시: `border-color: var(--color-primary); box-shadow: 0 0 0 3px var(--color-primary-light);`
   - 비밀번호 필드에 눈 아이콘(show/hide) 토글

3. **CTA 문구 강화**:
   - "저장된 리포트를 쓰려면 계정을 만들면 됩니다" → **"무료로 시작하세요 — 분석 결과를 저장하고 언제든 다시 확인할 수 있습니다"**
   - 회원가입 버튼: "회원가입" → **"무료로 시작하기"**

4. **신뢰 요소 추가** (폼 하단):
   - "🔒 데이터는 안전하게 암호화됩니다"
   - "가입 시 무료 분석 100회 제공"

---

## UI-8: 요금제(Pricing) 페이지

### 현재 문제
- **"요금제 (MVP)"** 타이틀에 MVP 표기 → 제품 완성도 의심
- 3개 플랜이 동일한 스타일 → 어떤 플랜을 골라야 할지 가이드 없음
- 추천 플랜 강조 없음
- 기능 비교가 텍스트 나열 → 한눈에 비교 불가
- "Basic 시작하기", "Pro 시작하기" 버튼이 너무 작고 눈에 띄지 않음

### 변경사항

1. **타이틀 변경**: "요금제 (MVP)" → **"요금제"** (MVP 제거)
2. **서브 타이틀**: "현재는 MVP 단계이며..." → **"비즈니스 규모에 맞는 플랜을 선택하세요"**

3. **3-컬럼 카드 레이아웃** (모바일: 세로 스택):
   ```
   ┌──────────┐  ┌═══════════════┐  ┌──────────┐
   │   무료    │  ║  ⭐ Basic     ║  │   Pro    │
   │          │  ║  (추천)       ║  │          │
   │  ₩0     │  ║  월 39,000원   ║  │ 월 89,000│
   │          │  ║              ║  │          │
   │  기능...  │  ║  기능...      ║  │  기능... │
   │          │  ║              ║  │          │
   │ [시작]   │  ║ [Basic 시작]  ║  │ [Pro 시작]│
   └──────────┘  └═══════════════┘  └──────────┘
   ```
   - **Basic 카드 강조**: `border: 2px solid var(--color-primary); box-shadow: var(--shadow-lg);` + 상단에 "추천" 뱃지
   - Basic 카드 살짝 위로 올림: `transform: translateY(-8px)` — 시선 유도
   - 무료/Pro 카드: 일반 보더

4. **기능 비교 체크마크 방식**:
   - ✅ 포함 / ❌ 미포함 / 텍스트 값 으로 통일
   - 각 기능 행에 hover 시 툴팁으로 상세 설명

5. **CTA 버튼 차별화**:
   - 무료: 아웃라인 버튼 (보조)
   - Basic: 프라이머리 채움 버튼 + 크게
   - Pro: 프라이머리 채움 버튼

6. **가격 표시 개선**:
   - 금액 크게 (font-size: 36px, font-weight: 800)
   - "월" 작게 표시
   - Basic에 "1일 약 1,300원" 같은 일 환산 금액 추가

---

## UI-9: 사용법(Help) 페이지

### 현재 문제
- 내용이 너무 빈약 (3단계만 설명)
- 스크린샷/이미지 가이드 없음 → 실제 사용 경험 전달 불가
- FAQ 없음
- 페이지 하단 "저장(선택)" 섹션이 뜬금없이 다른 배경색

### 변경사항

1. **히어로 섹션**:
   ```
   ┌─────────────────────────────────────┐
   │  📖 사용법                           │
   │  CSV만 있으면 3분 만에 매출 개선       │
   │  포인트를 확인할 수 있습니다           │
   └─────────────────────────────────────┘
   ```

2. **단계별 가이드 리디자인** (현재 3단계 → 4단계로 확장):
   - 각 단계를 **번호 + 아이콘 + 제목 + 설명 + 스크린샷 영역** 구조로
   ```
   ① CSV 준비     — 리뷰 내용(필수), 별점(권장), 작성일(선택)
   ② 파일 업로드   — 드래그 앤 드롭으로 간편 업로드
   ③ 컬럼 매핑     — 어느 열이 리뷰인지 한 번만 선택
   ④ 결과 확인     — 분석 결과를 바로 활용하거나 PDF로 다운로드
   ```
   - 각 단계 사이에 연결 화살표 또는 점선
   - (향후) 각 단계에 실제 대시보드 스크린샷 이미지 추가 가능하도록 `<Image>` placeholder 확보

3. **FAQ 섹션 추가** (아코디언 형태):
   - "어떤 CSV 형식을 지원하나요?"
   - "리뷰가 몇 개 이상이어야 의미 있는 분석이 되나요?"
   - "분석 데이터는 안전한가요?"
   - "LLM 고급 분석은 무엇인가요?"
   - "PDF 리포트에는 어떤 내용이 포함되나요?"
   - "요금제를 변경하려면 어떻게 하나요?"

4. **"저장(선택)" 영역 통합**: 별도 배경색 제거, FAQ 아래에 일반 카드로 배치

5. **하단 CTA**: "지금 분석하기" 버튼 → 프라이머리 버튼, 중앙 정렬, 넉넉한 크기

---

## UI-10: 푸터 개선

### 현재 문제
- "Terms of Service · Privacy Policy" 텍스트 링크 2개만 존재
- 서비스에 대한 신뢰 정보 없음

### 변경사항

1. **3-컬럼 푸터**:
   ```
   ┌──────────────────────────────────────────────────┐
   │  ReviewBoost          서비스            고객지원    │
   │  리뷰 기반 매출 개선   사용법             이메일 문의 │
   │                      요금제             FAQ       │
   │                      분석하기                     │
   │                                                  │
   │  © 2025 ReviewBoost. All rights reserved.        │
   │  이용약관 · 개인정보처리방침                         │
   └──────────────────────────────────────────────────┘
   ```
   - 배경: `var(--color-text-primary)` (다크) + 화이트 텍스트
   - 또는 밝은 그레이 배경에 구분선
   - 고객지원 이메일 표시 → 신뢰 요소

---

## UI-11: 반응형(Responsive) 개선

### 현재 문제
- 모바일에서 테이블이 깨질 수 있음
- 네비게이션이 모바일에서 줄바꿈

### 변경사항

1. **모바일 네비게이션**: 768px 이하에서 햄버거 메뉴로 전환
2. **핵심 지표 카드**: 모바일에서 1-컬럼 세로 스택
3. **요금제 카드**: 모바일에서 세로 스택, 추천 카드 먼저 표시
4. **테이블**: 모바일에서 카드형으로 변환 또는 가로 스크롤

### 브레이크포인트
```css
/* 모바일 */  @media (max-width: 640px) { ... }
/* 태블릿 */  @media (max-width: 768px) { ... }
/* 데스크탑 */ @media (min-width: 769px) { ... }
```

---

## UI 구현 순서

1. **UI-공통**: 디자인 토큰 CSS 변수 정의 + Pretendard 폰트 적용 + 배경색 교체
2. **UI-1**: 네비게이션 바 (모든 페이지에 영향, 먼저 처리)
3. **UI-2**: 카드 시스템 + 레이아웃 통일 (전체 기반)
4. **UI-3**: 핵심 지표 카드
5. **UI-4**: 데이터 테이블
6. **UI-5**: 업로드 영역
7. **UI-7**: 로그인/회원가입
8. **UI-8**: 요금제 페이지
9. **UI-9**: 사용법 페이지
10. **UI-10**: 푸터
11. **UI-11**: 반응형 점검
12. **UI-6**: 개선 제안 영역 (기능 5 구현 시 체크리스트로 대체)

### UI 작업 주의사항
- 기존 기능이 깨지지 않도록 스타일 변경은 **점진적으로** 적용
- Tailwind CSS를 사용 중이면 커스텀 CSS 변수와 Tailwind를 조화시킬 것 (tailwind.config.js에 토큰 연결)
- 각 UI 변경 후 `npm run build` 통과 확인
- 커밋: `style: redesign navigation bar`, `style: improve pricing page` 등

---

# Part B: 신규 기능 5종

> Part A의 UI 리디자인이 완료된 후, 새 디자인 시스템 위에서 아래 기능을 구현합니다.
> 새 기능의 UI 컴포넌트는 Part A에서 정의한 디자인 토큰/카드 시스템을 따릅니다.

---

## 기능 1: 긴급 대응 리스트 + 원문 하이라이트

### 목적
판매자가 "지금 당장 대응해야 할 리뷰"를 즉시 파악할 수 있게 한다.

### 요구사항

1. 분석 완료된 `ClassifiedReview[]`에서 아래 조건을 모두 만족하는 리뷰를 필터링:
   - 별점 1~2점
   - 감성(sentiment)이 `negative`
   - 작성일이 있는 경우: 최근 7일 이내 우선 정렬 (날짜 없으면 별점 낮은순 → 리뷰 길이 긴 순)
   - 최대 10건 표시

2. 각 리뷰 원문에서 부정 키워드(`src/lib/keywords.ts`의 추출 결과 활용)를 **하이라이트** 처리
   - 하이라이트: `background: color-mix(in srgb, var(--color-danger) 15%, white); padding: 1px 3px; border-radius: 3px;`

3. 각 리뷰 옆에 해당 리뷰의 **카테고리**(배송/품질/가격/사용성/CS)를 뱃지로 + **별점** 표시

4. 리스트 상단에 요약 문구 표시:
   - 예: "긴급 대응이 필요한 리뷰 8건 (최근 7일 이내 3건)"

### UI 위치 & 스타일
- 핵심 지표 섹션 바로 아래
- 섹션 제목: **"🚨 긴급 대응 필요"** + 좌측 `border-left: 4px solid var(--color-danger)`
- collapsible 카드 (기본 펼침, 클릭 시 접기)
- 각 리뷰 항목: 카드 내 구분선으로 분리, 리뷰 텍스트 왼쪽 + 메타 정보(카테고리/별점/날짜) 오른쪽

### 구현 파일
- `src/lib/urgent_reviews.ts` — 필터링/정렬/하이라이트 로직
- 타입: `UrgentReview { review: ClassifiedReview; highlightedText: string; daysSinceWritten: number | null }`
- 대시보드 컴포넌트에 `UrgentReviewsSection` 추가

---

## 기능 2: 우선순위 매트릭스 (Impact × Frequency)

### 목적
"어떤 문제 카테고리부터 해결해야 하는가"를 데이터 기반으로 시각화한다.

### 요구사항

1. 기존 6개 카테고리(배송/품질/가격/사용성/CS/기타)별로 아래 두 축을 계산:
   - **빈도(Frequency)**: 해당 카테고리에 분류된 부정 리뷰 건수 / 전체 리뷰 건수 × 100 (%)
   - **영향도(Impact)**: 해당 카테고리 부정 리뷰의 평균 별점과 전체 평균 별점의 차이 (절대값). 별점 하락폭이 클수록 영향도가 높음

2. 결과를 4사분면으로 분류:
   - **즉시 해결** (빈도 高 + 영향도 高): `var(--color-danger)` 뱃지
   - **모니터링** (빈도 高 + 영향도 低): `var(--color-warning)` 뱃지
   - **개선 검토** (빈도 低 + 영향도 高): 노란색 뱃지
   - **관찰** (빈도 低 + 영향도 低): 회색 뱃지
   - 高/低 기준: 각 축의 중앙값(median) 사용

3. 각 카테고리에 대해 한 줄 액션 요약 자동 생성:
   - 예: "품질 — 즉시 해결 | 부정 리뷰 35건(29%), 평균 별점 1.8 (전체 대비 -2.0)"

### UI 위치 & 스타일
- 긴급 대응 섹션 아래
- 섹션 제목: **"📊 문제 우선순위 매트릭스"** + 좌측 `border-left: 4px solid var(--color-warning)`
- UI-4의 테이블 스타일 적용: 가로 바, zebra striping, 색상 뱃지
- "즉시 해결" 행은 배경 `var(--color-danger-light)` 약하게

### 구현 파일
- `src/lib/priority_matrix.ts` — 계산 로직
- 타입: `PriorityMatrixItem { category: Category; frequency: number; frequencyPct: number; impact: number; quadrant: 'critical' | 'monitor' | 'review' | 'observe'; actionSummary: string }`
- `AnalysisOutput`에 `priorityMatrix?: PriorityMatrixItem[]` 추가

---

## 기능 3: 별점 시뮬레이션

### 목적
"1점 리뷰 N건만 해결하면 평균 별점이 X → Y로 올라갑니다"를 보여줘서 행동 동기를 부여한다.

### 요구사항

1. 현재 별점 분포(1~5점 각 건수)와 평균 별점을 기반으로 시뮬레이션:
   - 시나리오 A: 1점 리뷰 중 상위 N건이 삭제되거나 3점으로 개선되었을 때의 예상 평균 별점
   - 시나리오 B: 1~2점 리뷰 중 상위 N건이 4점으로 개선되었을 때의 예상 평균 별점
   - N은 전체 1~2점 리뷰의 25%, 50%, 100%에 해당하는 값을 각각 계산

2. 결과를 간결한 카드로 표시:
   - 현재 평균 별점: 크게 표시
   - 각 시나리오: "1점 리뷰 5건 해결 시 → **4.4** (+0.2)"
   - 델타 값에 `var(--color-success)` 적용

3. 각 시나리오 옆에 해당되는 주요 불만 키워드 1~2개를 작은 뱃지로 표시

### UI 위치 & 스타일
- 핵심 지표 카드 바로 아래
- 섹션 제목: **"📈 별점 개선 시뮬레이션"** + 좌측 `border-left: 4px solid var(--color-success)`
- 현재 별점과 시나리오들을 카드 안에 깔끔하게 배치

### 구현 파일
- `src/lib/rating_simulation.ts`
- 타입: `RatingSimulation { currentAvg: number; scenarios: SimulationScenario[] }`
- `SimulationScenario { label: string; resolvedCount: number; newAvg: number; delta: number; relatedKeywords: string[] }`

---

## 기능 4: 긍정 키워드 활용 제안

### 목적
부정 분석에 치우친 현재 리포트에 "강점 강화" 관점을 추가한다.

### 요구사항

1. 긍정 리뷰(sentiment === 'positive')에서 키워드 추출:
   - `src/lib/keywords.ts`의 기존 로직을 확장하여 긍정 리뷰용 키워드 추출 함수 추가
   - 불용어(stopwords) 목록은 기존 부정 키워드와 동일하게 적용
   - 상위 10개 긍정 키워드 추출

2. 각 긍정 키워드에 대해 활용 제안 생성:
   - LLM 사용 가능 시: OpenAI에 긍정 키워드 목록 + 샘플 긍정 리뷰를 전달하여 활용 제안 생성
   - LLM 미사용 시: 템플릿 기반 fallback
     - 예: `"'{keyword}'가 {count}회 언급됨 → 상세페이지 타이틀/썸네일에 '{keyword}' 강조 권장"`

3. 활용 제안 카테고리:
   - **상세페이지 반영**: 타이틀, 썸네일, 상세 설명에 해당 키워드 강조
   - **광고 소재 활용**: 해당 키워드를 광고 카피에 활용
   - **리뷰 답글 활용**: 긍정 리뷰에 감사 답글 시 해당 키워드 재강조

### UI 위치 & 스타일
- 부정 키워드 TOP10 아래
- 섹션 제목: **"✅ 긍정 키워드 & 강점 활용 전략"** + 좌측 `border-left: 4px solid var(--color-success)`
- 키워드 테이블: UI-4 스타일 적용, 바 색상은 `var(--color-success)`
- 활용 제안: 각 키워드 클릭/펼치면 제안 텍스트 표시 (아코디언)

### 구현 파일
- `src/lib/keywords.ts`에 `extractPositiveKeywords()` 함수 추가
- `src/lib/openai_suggestions.ts`에 긍정 키워드 활용 제안 프롬프트 추가 + 템플릿 fallback
- 타입: `PositiveKeyword { keyword: string; count: number; suggestions: string[] }`

---

## 기능 5: 체크리스트형 액션 아이템

### 목적
현재 텍스트 덩어리인 "개선 제안"을 구조화된 체크리스트로 바꿔 실행력을 높인다.

### 요구사항

1. 기존 개선 제안(상세페이지 문구, CS 응대, FAQ)을 **체크리스트 아이템**으로 구조화:
   - 각 아이템 구조: `체크박스 | 액션 내용 | 관련 불만 키워드(뱃지) | 해당 리뷰 건수 | 예상 영향도(뱃지)`
   - 예: `☐ "사이즈가 작다" 불만 17건 → 실측 사이즈 비교표 추가 [영향도: 높음]`

2. LLM 사용 시:
   - 기존 `openai_suggestions.ts`의 제안 생성 프롬프트를 수정하여 JSON 구조로 반환받기
   - 프롬프트에 "각 제안을 개별 액션 아이템으로 분리하고, 관련 키워드와 리뷰 건수를 포함하라"는 지시 추가
   - 반환 형식:
     ```json
     {
       "actionItems": [
         {
           "action": "실측 사이즈 비교표를 상세페이지에 추가",
           "relatedKeyword": "사이즈",
           "reviewCount": 17,
           "impact": "high",
           "category": "detailPage"
         }
       ]
     }
     ```

3. LLM 미사용 시 (템플릿 fallback):
   - 부정 키워드 TOP10과 카테고리 데이터를 기반으로 자동 생성
   - 키워드별로 미리 정의된 액션 템플릿 매핑
     - 배송 관련: "예상 배송일 안내 문구 추가", "배송 지연 시 대응 프로세스 안내"
     - 품질 관련: "품질 검수 과정 상세페이지에 명시", "교환/반품 절차 간소화 안내"
     - 가격 관련: "가격 대비 스펙 비교표 추가", "할인/쿠폰 정보 가시성 개선"
     - 사용성 관련: "사용 방법 이미지/영상 추가", "사이즈/스펙 가이드 보강"
     - CS 관련: "응답 시간 단축 안내", "1:1 문의 접수 채널 명시"

4. 체크 상태는 클라이언트에서만 관리 (`useState`)

5. 체크리스트 상단에 진행률 프로그레스 바:
   - "3/8 완료 (37%)"
   - 바: `background: var(--color-primary)`, 높이 8px, `border-radius: 9999px`

### UI 위치 & 스타일
- 기존 "개선 제안: 상세페이지 문구"와 "개선 제안: CS 응대/FAQ" 섹션을 **대체**
- 섹션 제목: **"✅ 개선 액션 체크리스트"** + 좌측 `border-left: 4px solid var(--color-primary)`
- 카테고리별 탭 또는 그룹핑: 상세페이지 / CS 응대 / FAQ
- 영향도별 정렬 (높음 → 중간 → 낮음)
- 영향도 뱃지 색상: 높음=`var(--color-danger)`, 중간=`var(--color-warning)`, 낮음=회색
- 체크 시 항목에 `opacity: 0.5; text-decoration: line-through` 처리

### 구현 파일
- `src/lib/action_items.ts` — 템플릿 기반 액션 아이템 생성 로직
- `src/lib/openai_suggestions.ts` — LLM 프롬프트 수정 (기존 함수 확장)
- 타입: `ActionItem { id: string; action: string; relatedKeyword: string; reviewCount: number; impact: 'high' | 'medium' | 'low'; category: 'detailPage' | 'csResponse' | 'faq' }`
- 대시보드 컴포넌트에 `ActionChecklistSection` 추가

---

# 전체 구현 순서

## Phase 1: 디자인 시스템 기반 (Part A 핵심)
1. 디자인 토큰 CSS 변수 + Pretendard 폰트 적용
2. 네비게이션 바 리디자인 (UI-1)
3. 카드 시스템 + 페이지 레이아웃 (UI-2)
4. 반응형 기본 (UI-11)

## Phase 2: 대시보드 UI 개선 (Part A 대시보드)
5. 핵심 지표 카드 (UI-3)
6. 데이터 테이블 (UI-4)
7. 업로드 영역 (UI-5)

## Phase 3: 서브 페이지 UI 개선 (Part A 나머지)
8. 로그인/회원가입 (UI-7)
9. 요금제 (UI-8)
10. 사용법 + FAQ (UI-9)
11. 푸터 (UI-10)

## Phase 4: 신규 기능 (Part B)
12. 타입 정의 — `src/lib/types.ts`에 모든 새 타입 추가
13. 기능 1 (긴급 대응 리스트)
14. 기능 3 (별점 시뮬레이션)
15. 기능 2 (우선순위 매트릭스)
16. 기능 4 (긍정 키워드)
17. 기능 5 (체크리스트 — UI-6 대체)

## Phase 5: PDF 반영
18. PDF 리포트 템플릿에 신규 섹션 추가

---

# 대시보드 최종 섹션 배치

1. 리뷰 CSV 분석 (업로드 + 미리보기 + 스텝퍼) — 리디자인
2. 핵심 지표 (리뷰 수, 부정비율, 우선순위점수) — 리디자인
3. 📈 별점 개선 시뮬레이션 — **신규**
4. 🚨 긴급 대응 필요 — **신규**
5. 📊 문제 우선순위 매트릭스 — **신규**
6. 부정 키워드 TOP10 — 리디자인
7. ✅ 긍정 키워드 & 강점 활용 전략 — **신규**
8. 문제 카테고리 — 리디자인
9. ✅ 개선 액션 체크리스트 — **신규 (기존 개선 제안 대체)**
10. PDF 다운로드 — 기존

---

# 공통 주의사항

- `AnalysisOutput` 타입 확장 시 모든 새 필드는 `optional(?)`로 추가하여 하위 호환성 유지
- `/api/analyze` 엔드포인트에서 새 로직을 호출하되, 기존 응답 필드는 절대 제거하지 않음
- PDF 리포트 템플릿에도 새 섹션을 추가하되, 해당 데이터가 없으면 섹션을 생략
- 각 단계 구현 후 `npm run lint`와 `npm run build`가 통과하는지 반드시 확인
- 커밋은 단위별 분리:
  - `style: add design tokens and Pretendard font`
  - `style: redesign navigation bar`
  - `style: improve dashboard metric cards`
  - `feat: add urgent review list`
  - `feat: add priority matrix`
  - 등
