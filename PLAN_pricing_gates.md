# ReviewBoost 요금제 기능 차등화 구현 계획

> 이 문서는 Claude Code에게 전달하는 구현 지시서입니다.
> 기존 코드베이스(`CLAUDE.md` 참고)와 `PLAN_v2_complete.md`(적용 완료)를 기반으로 요금제별 기능 게이팅을 구현합니다.

---

## 배경

현재 요금제 차등이 "분석 횟수"와 "히스토리 수"로만 되어 있어 무료 사용자의 업그레이드 동기가 약하다.
v2 신규 기능(긴급 대응, 우선순위 매트릭스, 별점 시뮬레이션, 긍정 키워드, 체크리스트)이 추가되었으므로,
이 기능들을 요금제별로 차등 제공하여 **"무료로 맛보기 → Basic으로 실무 활용 → Pro로 팀 운영"** 전환 흐름을 만든다.

---

## 공통 원칙

- 기존 `src/lib/plan.ts`의 플랜 판정 로직을 확장
- 새로운 게이팅 로직은 `src/lib/plan_gates.ts`에 분리
- API 응답에서 데이터를 잘라내지 않음 — **클라이언트에서 UI 게이팅** (블러/잠금) 처리
  - 이유: API는 항상 전체 데이터를 반환하되, 클라이언트가 플랜에 따라 표시 범위를 결정
  - 단, LLM 호출 자체는 서버에서 플랜 체크 후 실행 여부 결정 (비용 통제)
- 게이팅 UI는 재사용 가능한 `<PlanGate>` 래퍼 컴포넌트로 통일
- 모든 잠금 영역에 업그레이드 CTA 포함

---

## 1. 플랜별 기능 매트릭스

### 1-1. 분석 제한

| 항목 | Free | Basic (39,000원) | Pro (89,000원) |
|---|---|---|---|
| 월 분석 횟수 | 5회 | 200회 | 1,000회 |
| 1회 분석 최대 리뷰 수 | 50건 | 500건 | 2,000건 |
| 분석 방식 | 휴리스틱만 | 휴리스틱 + LLM | 휴리스틱 + LLM (대량 우선) |

### 1-2. 기존 기능 차등

| 기능 | Free | Basic | Pro |
|---|---|---|---|
| 핵심 지표 (리뷰 수, 부정비율, 우선순위점수) | ✅ 전체 | ✅ 전체 | ✅ 전체 |
| 부정 키워드 TOP10 | 상위 5개만 표시 (6~10위 블러) | ✅ 전체 | ✅ 전체 |
| 문제 카테고리 | ✅ 전체 | ✅ 전체 | ✅ 전체 |
| 개선 제안 (체크리스트 이전 버전) | 미리보기 텍스트만 | ✅ 전체 | ✅ 전체 |

### 1-3. v2 신규 기능 차등

| 기능 | Free | Basic | Pro |
|---|---|---|---|
| 🚨 긴급 대응 리스트 | 상위 3건만 (나머지 블러) | ✅ 전체 10건 | ✅ 전체 10건 |
| 📊 우선순위 매트릭스 | 사분면 라벨만 (액션 요약 잠금) | ✅ 전체 + 액션 요약 | ✅ 전체 + 액션 요약 |
| 📈 별점 시뮬레이션 | 🔒 잠금 (미리보기 카드) | ✅ 전체 | ✅ 전체 |
| ✅ 긍정 키워드 활용 | 🔒 잠금 (미리보기 카드) | ✅ 전체 | ✅ 전체 |
| ✅ 개선 액션 체크리스트 | 상위 3건만 (나머지 블러) | ✅ 전체 | ✅ 전체 |

### 1-4. 리포트 & 저장

| 기능 | Free | Basic | Pro |
|---|---|---|---|
| PDF 다운로드 | ✅ (워터마크 포함) | ✅ 워터마크 없음 | ✅ 워터마크 없음 |
| PDF 내용 범위 | 핵심 지표 + 부정키워드 5개 | 전체 섹션 | 전체 섹션 + 브랜드 로고 커스텀 |
| 분석 히스토리 저장 | 최근 3건 | 최근 100건 | 무제한 |
| CSV 원본 보관 | ❌ (분석 후 미보관) | 30일 | 90일 |

### 1-5. Pro 전용 기능

| 기능 | Basic | Pro |
|---|---|---|
| 팀원 좌석 | 1명 | 최대 5명 |
| 리포트 공유 링크 | ❌ | ✅ |
| 경쟁사 비교 분석 | ❌ | 🏷️ 준비 중 |
| 시계열 트렌드 리포트 | ❌ | 🏷️ 준비 중 |
| API 액세스 | ❌ | 🏷️ 준비 중 |
| 브랜드 로고 PDF 커스텀 | ❌ | ✅ |
| 지원 | 이메일 (48h) | 이메일 (24h) + 채팅 |

---

## 2. 타입 정의

`src/lib/types.ts`에 추가:

```typescript
/** 플랜별 기능 게이팅 설정 */
export interface PlanGates {
  plan: 'free' | 'basic' | 'pro';

  // 분석 제한
  monthlyAnalysisLimit: number;       // 5 / 200 / 1000
  maxReviewsPerAnalysis: number;      // 50 / 500 / 2000
  allowLLM: boolean;                  // false / true / true

  // 기능 표시 범위
  negativeKeywordVisibleCount: number;  // 5 / 10 / 10
  urgentReviewVisibleCount: number;     // 3 / 10 / 10
  actionItemVisibleCount: number;       // 3 / all / all  (-1 = unlimited)
  showPriorityActionSummary: boolean;   // false / true / true
  showRatingSimulation: boolean;        // false / true / true
  showPositiveKeywords: boolean;        // false / true / true

  // 리포트
  pdfWatermark: boolean;               // true / false / false
  pdfFullSections: boolean;            // false / true / true
  pdfBrandLogo: boolean;               // false / false / true

  // 저장
  historyLimit: number;                // 3 / 100 / -1 (unlimited)
  csvRetentionDays: number;            // 0 / 30 / 90

  // Pro 전용
  teamSeats: number;                   // 1 / 1 / 5
  shareableLinks: boolean;             // false / false / true
}
```

---

## 3. 플랜 게이팅 로직

### 3-1. `src/lib/plan_gates.ts` (신규 파일)

```typescript
import { PlanGates } from './types';

const FREE_GATES: PlanGates = {
  plan: 'free',
  monthlyAnalysisLimit: 5,
  maxReviewsPerAnalysis: 50,
  allowLLM: false,
  negativeKeywordVisibleCount: 5,
  urgentReviewVisibleCount: 3,
  actionItemVisibleCount: 3,
  showPriorityActionSummary: false,
  showRatingSimulation: false,
  showPositiveKeywords: false,
  pdfWatermark: true,
  pdfFullSections: false,
  pdfBrandLogo: false,
  historyLimit: 3,
  csvRetentionDays: 0,
  teamSeats: 1,
  shareableLinks: false,
};

const BASIC_GATES: PlanGates = {
  plan: 'basic',
  monthlyAnalysisLimit: 200,
  maxReviewsPerAnalysis: 500,
  allowLLM: true,
  negativeKeywordVisibleCount: 10,
  urgentReviewVisibleCount: 10,
  actionItemVisibleCount: -1,  // unlimited
  showPriorityActionSummary: true,
  showRatingSimulation: true,
  showPositiveKeywords: true,
  pdfWatermark: false,
  pdfFullSections: true,
  pdfBrandLogo: false,
  historyLimit: 100,
  csvRetentionDays: 30,
  teamSeats: 1,
  shareableLinks: false,
};

const PRO_GATES: PlanGates = {
  plan: 'pro',
  monthlyAnalysisLimit: 1000,
  maxReviewsPerAnalysis: 2000,
  allowLLM: true,
  negativeKeywordVisibleCount: 10,
  urgentReviewVisibleCount: 10,
  actionItemVisibleCount: -1,
  showPriorityActionSummary: true,
  showRatingSimulation: true,
  showPositiveKeywords: true,
  pdfWatermark: false,
  pdfFullSections: true,
  pdfBrandLogo: true,
  historyLimit: -1,
  csvRetentionDays: 90,
  teamSeats: 5,
  shareableLinks: true,
};

export function getGatesForPlan(plan: 'free' | 'basic' | 'pro'): PlanGates {
  switch (plan) {
    case 'basic': return BASIC_GATES;
    case 'pro': return PRO_GATES;
    default: return FREE_GATES;
  }
}
```

### 3-2. 기존 `src/lib/plan.ts` 수정

기존 월간 분석 횟수 제한 로직을 `PlanGates`에서 가져오도록 리팩토링:

- `getMonthlyLimit(plan)` → `getGatesForPlan(plan).monthlyAnalysisLimit` 사용
- 기존 Free(100회) → Free(5회)로 변경
- 기존 Basic(500회) → Basic(200회)로 변경
- 기존 Pro(1500회) → Pro(1000회)로 변경

### 3-3. `/api/analyze` 엔드포인트 수정

아래 서버사이드 체크를 추가:

```typescript
// 1. 리뷰 수 상한 체크
const gates = getGatesForPlan(userPlan);
if (reviews.length > gates.maxReviewsPerAnalysis) {
  // 초과분 잘라내기 (최신순 우선 유지)
  reviews = reviews.slice(0, gates.maxReviewsPerAnalysis);
  // 응답에 truncated 플래그 추가
  result.truncated = true;
  result.truncatedFrom = originalCount;
  result.truncatedTo = gates.maxReviewsPerAnalysis;
}

// 2. LLM 사용 여부 체크
if (!gates.allowLLM) {
  // useLLM 파라미터 무시, 강제 heuristic
  analysisMode = 'heuristic';
}
```

---

## 4. 클라이언트 게이팅 UI

### 4-1. `<PlanGate>` 래퍼 컴포넌트

`src/components/PlanGate.tsx` (신규):

```typescript
interface PlanGateProps {
  /** 이 기능을 사용하려면 어느 플랜 이상이어야 하는가 */
  requiredPlan: 'basic' | 'pro';
  /** 현재 사용자 플랜 */
  currentPlan: 'free' | 'basic' | 'pro';
  /** 잠금 시 보여줄 미리보기 텍스트 */
  previewText?: string;
  /** children: 잠금이 아닐 때 보여줄 콘텐츠 */
  children: React.ReactNode;
}
```

**잠금 상태 렌더링**:
```
┌────────────────────────────────────────┐
│  🔒 {previewText}                      │
│                                        │
│  이 기능은 {requiredPlan} 플랜에서       │
│  이용할 수 있습니다.                     │
│                                        │
│  [플랜 업그레이드 →]                     │
└────────────────────────────────────────┘
```

스타일:
- 배경: `var(--color-bg)` + 점선 보더
- 중앙 정렬 텍스트
- CTA 버튼: `var(--color-primary)` 아웃라인 버튼 → `/pricing` 링크
- 높이: children의 예상 높이와 비슷하게 (min-height: 120px)

### 4-2. `<BlurGate>` 컴포넌트

부분 공개 + 나머지 블러 처리용 (`src/components/BlurGate.tsx`):

```typescript
interface BlurGateProps {
  /** 보여줄 아이템 수 */
  visibleCount: number;
  /** 전체 아이템 수 */
  totalCount: number;
  /** 잠금 해제에 필요한 플랜 */
  requiredPlan: 'basic' | 'pro';
  currentPlan: 'free' | 'basic' | 'pro';
  children: React.ReactNode;
}
```

**렌더링 방식**:
1. `children`을 `visibleCount`만큼 정상 렌더
2. 나머지 영역 위에 그라디언트 오버레이 + 블러:
   ```css
   .blur-overlay {
     position: relative;
   }
   .blur-overlay::after {
     content: '';
     position: absolute;
     bottom: 0;
     left: 0;
     right: 0;
     height: 120px;
     background: linear-gradient(transparent, var(--color-surface));
     backdrop-filter: blur(4px);
   }
   ```
3. 오버레이 중앙에 잠금 메시지:
   - "나머지 {totalCount - visibleCount}건은 Basic 플랜에서 확인 →"

### 4-3. 각 섹션별 게이팅 적용

**부정 키워드 TOP10** (`negativeKeywordVisibleCount`):
```tsx
<BlurGate
  visibleCount={gates.negativeKeywordVisibleCount}
  totalCount={keywords.length}
  requiredPlan="basic"
  currentPlan={userPlan}
>
  {keywords.map((kw, i) => <KeywordRow key={i} {...kw} />)}
</BlurGate>
```

**긴급 대응 리스트** (`urgentReviewVisibleCount`):
```tsx
<BlurGate
  visibleCount={gates.urgentReviewVisibleCount}
  totalCount={urgentReviews.length}
  requiredPlan="basic"
  currentPlan={userPlan}
>
  {urgentReviews.map((r, i) => <UrgentReviewCard key={i} {...r} />)}
</BlurGate>
```

**우선순위 매트릭스** (`showPriorityActionSummary`):
- 테이블 자체는 항상 표시 (카테고리, 빈도, 영향도, 사분면 라벨)
- "액션 요약" 컬럼만 Free에서 블러:
  ```tsx
  <td className={!gates.showPriorityActionSummary ? 'blur-text' : ''}>
    {item.actionSummary}
  </td>
  ```
  ```css
  .blur-text {
    filter: blur(5px);
    user-select: none;
    pointer-events: none;
  }
  ```
- 블러된 셀 hover 시 "Basic 플랜에서 확인" 툴팁

**별점 시뮬레이션** (`showRatingSimulation`):
```tsx
<PlanGate
  requiredPlan="basic"
  currentPlan={userPlan}
  previewText="1점 리뷰 5건만 해결하면 별점이 얼마나 오를까요?"
>
  <RatingSimulationSection data={simulation} />
</PlanGate>
```

**긍정 키워드 활용** (`showPositiveKeywords`):
```tsx
<PlanGate
  requiredPlan="basic"
  currentPlan={userPlan}
  previewText="긍정 리뷰에서 발견된 강점 키워드를 마케팅에 활용하세요"
>
  <PositiveKeywordsSection data={positiveKeywords} />
</PlanGate>
```

**체크리스트** (`actionItemVisibleCount`):
```tsx
<BlurGate
  visibleCount={gates.actionItemVisibleCount === -1 ? actionItems.length : gates.actionItemVisibleCount}
  totalCount={actionItems.length}
  requiredPlan="basic"
  currentPlan={userPlan}
>
  <ActionChecklistSection items={actionItems} />
</BlurGate>
```

---

## 5. PDF 워터마크 구현

### 5-1. Puppeteer (HTML 렌더링) 방식

PDF HTML 템플릿에 워터마크 레이어 추가:

```html
<!-- gates.pdfWatermark === true일 때만 삽입 -->
<div class="watermark">
  <span>ReviewBoost Free</span>
</div>

<style>
  .watermark {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%) rotate(-35deg);
    font-size: 72px;
    font-weight: 800;
    color: rgba(0, 0, 0, 0.04);
    white-space: nowrap;
    pointer-events: none;
    z-index: 9999;
  }
  @media print {
    .watermark { display: block; }
  }
</style>
```

### 5-2. PDFKit fallback 방식

```typescript
if (gates.pdfWatermark) {
  doc.save();
  doc.rotate(-35, { origin: [doc.page.width / 2, doc.page.height / 2] });
  doc.fontSize(60)
     .fillColor('#000000')
     .opacity(0.04)
     .text('ReviewBoost Free', doc.page.width / 2 - 200, doc.page.height / 2, {
       align: 'center',
     });
  doc.restore();
}
```

### 5-3. PDF 내용 범위 제한

`gates.pdfFullSections === false` (Free)일 때:
- PDF에 포함하는 섹션: 핵심 지표, 부정 키워드 (5개만), 문제 카테고리
- PDF에서 제외하는 섹션: 긴급 대응, 우선순위 매트릭스, 별점 시뮬레이션, 긍정 키워드, 체크리스트
- 제외된 섹션 자리에 한 줄 안내: "이 섹션은 Basic 플랜에서 이용할 수 있습니다 — reviewboost.co.kr/pricing"

---

## 6. 분석 횟수 초과 시 UX

### 6-1. 분석 전 체크

"분석 시작" 버튼 클릭 시, 남은 분석 횟수를 확인:

```tsx
// 남은 횟수 표시 (업로드 영역 하단)
<p className="text-sm text-muted">
  이번 달 분석: {usedCount}/{gates.monthlyAnalysisLimit}회 사용
</p>
```

### 6-2. 한도 도달 시

```
┌────────────────────────────────────────┐
│  이번 달 무료 분석 5회를 모두           │
│  사용했습니다.                          │
│                                        │
│  다음 달 1일에 초기화되거나,             │
│  Basic 플랜으로 업그레이드하면           │
│  월 200회까지 분석할 수 있습니다.        │
│                                        │
│  [Basic 시작하기]  [다음 달 기다리기]    │
└────────────────────────────────────────┘
```

### 6-3. 리뷰 수 초과 시

분석 결과 상단에 알림 배너:

```
⚠️ 업로드된 120건 중 50건만 분석되었습니다. 
   전체 리뷰를 분석하려면 Basic 플랜을 이용하세요. [업그레이드 →]
```

스타일: `background: var(--color-warning) 10% opacity; border-left: 4px solid var(--color-warning);`

---

## 7. 요금제 페이지 업데이트

`src/app/pricing/page.tsx` 수정:

### 7-1. 기존 변경

| 현재 | 변경 후 |
|---|---|
| 무료: 월 100회 | 무료: 월 5회 |
| Basic: 월 500회 | Basic: 월 200회 |
| Pro: 월 1,500회 | Pro: 월 1,000회 |

### 7-2. 기능 비교 테이블 추가

요금제 카드 아래에 상세 기능 비교 테이블 추가:

```
┌────────────────────────────────────────────────────┐
│               기능 비교                             │
├──────────────────┬────────┬────────┬───────────────┤
│                  │  무료   │ Basic  │     Pro       │
├──────────────────┼────────┼────────┼───────────────┤
│ 월 분석 횟수      │  5회   │ 200회  │  1,000회      │
│ 1회 최대 리뷰 수  │  50건  │ 500건  │  2,000건      │
│ AI 고급 분석      │   ❌   │  ✅    │   ✅          │
│ 긴급 대응 리스트   │ 3건   │ 전체   │   전체         │
│ 별점 시뮬레이션    │  🔒   │  ✅    │   ✅          │
│ 긍정 키워드 활용   │  🔒   │  ✅    │   ✅          │
│ 액션 체크리스트    │ 3건   │ 전체   │   전체         │
│ PDF 워터마크      │  있음  │ 없음   │   없음         │
│ 히스토리 저장      │ 3건   │ 100건  │   무제한       │
│ 팀원 좌석         │  1명  │  1명   │   5명          │
│ 리포트 공유 링크   │  ❌   │  ❌    │   ✅          │
│ 경쟁사 비교       │  ❌   │  ❌    │  🏷️ 준비 중   │
│ 트렌드 분석       │  ❌   │  ❌    │  🏷️ 준비 중   │
│ 지원             │ 기본   │ 이메일  │  우선 지원      │
└──────────────────┴────────┴────────┴───────────────┘
```

### 7-3. "준비 중" 기능 표시

Pro 카드에 경쟁사 비교, 트렌드 분석, API 액세스를 `🏷️ 준비 중` 뱃지로 표시:
- 뱃지 스타일: `background: var(--color-primary-light); color: var(--color-primary); font-size: 11px; border-radius: 9999px; padding: 2px 8px;`
- 이 기능들이 "곧 제공될 예정"이라는 인식을 주어 Pro 선택의 미래 가치를 전달

---

## 8. 플랜 컨텍스트 전달

### 8-1. 대시보드 레이아웃에서 플랜 정보 로드

`src/app/dashboard/layout.tsx`에서:

```typescript
// 로그인 사용자: Supabase에서 플랜 조회
// 비로그인 사용자: 'free' 고정
const userPlan = user ? await getUserPlan(user.id) : 'free';
const gates = getGatesForPlan(userPlan);
```

### 8-2. 클라이언트에 전달

React Context 또는 props drilling으로 `gates` 객체를 대시보드 하위 컴포넌트에 전달:

```typescript
// src/contexts/PlanContext.tsx (신규)
export const PlanContext = createContext<PlanGates>(FREE_GATES);
export const usePlanGates = () => useContext(PlanContext);
```

대시보드 레이아웃:
```tsx
<PlanContext.Provider value={gates}>
  {children}
</PlanContext.Provider>
```

각 섹션 컴포넌트에서:
```tsx
const gates = usePlanGates();
```

---

## 9. DEV 플래그 확장

`src/lib/dev_flags.ts`에 추가:

```typescript
// 로컬 개발 시 특정 플랜으로 강제 설정
// .env.local: DEV_FORCE_PLAN=pro
export function getDevForcePlan(): 'free' | 'basic' | 'pro' | null {
  if (process.env.NODE_ENV !== 'development') return null;
  const val = process.env.DEV_FORCE_PLAN;
  if (val === 'free' || val === 'basic' || val === 'pro') return val;
  return null;
}
```

`plan.ts`에서 dev flag를 기존 판정 로직보다 우선 적용:
```typescript
const devPlan = getDevForcePlan();
if (devPlan) return devPlan;
```

---

## 구현 순서

1. **타입 정의** — `PlanGates` 타입을 `src/lib/types.ts`에 추가
2. **plan_gates.ts** — 3개 플랜 게이팅 설정 객체 + `getGatesForPlan()` 함수
3. **PlanContext** — React Context 생성 + 대시보드 레이아웃에 Provider 연결
4. **`<PlanGate>` 컴포넌트** — 잠금 UI 래퍼
5. **`<BlurGate>` 컴포넌트** — 부분 공개 + 블러 UI 래퍼
6. **대시보드 각 섹션에 게이팅 적용** — 부정 키워드, 긴급 대응, 매트릭스, 시뮬레이션, 긍정 키워드, 체크리스트
7. **plan.ts 수정** — 분석 횟수/리뷰 수 상한 변경
8. **`/api/analyze` 수정** — 서버사이드 리뷰 수 상한 + LLM 사용 체크
9. **PDF 워터마크 + 내용 범위 제한**
10. **요금제 페이지 업데이트** — 숫자 변경 + 기능 비교 테이블 + "준비 중" 뱃지
11. **분석 횟수 초과 UX** — 잔여 횟수 표시 + 초과 시 모달
12. **DEV 플래그 추가** — `DEV_FORCE_PLAN`

### 커밋 단위

```
feat: add PlanGates type and gate configuration
feat: add PlanContext and gate wrapper components (PlanGate, BlurGate)
feat: apply plan gating to dashboard sections
refactor: update analysis limits (free:5, basic:200, pro:1000)
feat: add server-side review count cap and LLM gate in /api/analyze
feat: add PDF watermark for free plan
style: update pricing page with feature comparison table
feat: add analysis quota UX (remaining count, exceeded modal)
chore: add DEV_FORCE_PLAN dev flag
```

### 주의사항

- 기존 `plan.ts`의 인터페이스를 변경할 때, 이미 해당 함수를 사용하는 곳을 모두 확인
- `PlanGates` 값은 서버/클라이언트 양쪽에서 사용 — 타입 파일은 `'use client'`/`'use server'` 없이 순수 타입으로 유지
- 비로그인 사용자도 분석 가능한 기존 동작 유지 — 비로그인 = Free 플랜으로 처리
- 게이팅은 UI 레벨에서 처리하되, **LLM 호출과 분석 횟수 차감은 반드시 서버에서** 검증 (클라이언트 우회 방지)
- 무료에서 Basic으로의 전환이 가장 중요한 지표 — 모든 잠금 영역에 `/pricing` CTA가 있는지 확인
