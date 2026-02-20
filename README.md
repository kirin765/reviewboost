# ReviewBoost (MVP)

`프로젝트계획서.txt` 기준으로 만든 MVP 구현체입니다.

## 릴리즈 노트

- `RELEASE_NOTES.md`

## 기능

- CSV 리뷰 업로드 (리뷰 텍스트 + 별점만으로 동작)
- CSV 미리보기 + 컬럼 매핑(리뷰/별점/작성일)
- 자동 분석
  - 긍정/부정 비율
  - 부정 키워드 TOP10
  - 문제 카테고리 분류: 배송/품질/가격/사용성/CS (+ 기타)
- 개선 제안 생성
  - 상세페이지 수정 문구(초안)
  - 고객 불만 대응 문구(초안)
  - FAQ 추천
- 요약 리포트 PDF 다운로드
  - 기본: Puppeteer(HTML 렌더링)
  - 환경 의존성 문제 시: PDFKit으로 자동 fallback
  - PDFKit에서 한글이 깨지면 한글 폰트를 제공해야 합니다(아래 참고).

## 실행

1. 의존성 설치
```bash
npm i
```

2. 환경변수 설정
```bash
cp .env.example .env.local
```

3. 개발 서버 (3001)
```bash
npm run dev
```

- env 빠른 전환:
```bash
npm run dev:sandbox   # PADDLE_ENV=sandbox
npm run dev:live      # PADDLE_ENV=live
```

4. 운영 서버

PM2 배포(권장):
```bash
npm run deploy
```

- 배포 모드별 실행:
```bash
npm run deploy:staging
npm run deploy:prod
```

레거시 수동 명령(참고):
```bash
npm run build
pm2 start reviewboost
```

코드 변경 후 재배포(레거시):
```bash
npm run build
pm2 restart reviewboost --update-env
```

- `npm run dev`: `3001`
- `npm run start`: `3000`

## 샘플 CSV

- `examples/sample.csv`

## 환경변수

- `OPENAI_API_KEY`: 있으면 LLM 기반 개선 제안이 더 정교해집니다. 없으면 템플릿 기반으로 fallback 합니다.
- (선택) 대시보드에서 `LLM 고급 분석`을 켜면 감성/카테고리 분류에도 OpenAI를 사용합니다.
- `OPENAI_CLASSIFY_TIMEOUT_MS`(선택, 기본 `8000`): LLM 분류 요청 타임아웃(ms)
- `OPENAI_CLASSIFY_BATCH_SIZE`(선택, 기본 `60`): LLM 분류 배치 크기
- `OPENAI_SUGGEST_TIMEOUT_MS`(선택, 기본 `6000`): 제안 생성 요청 타임아웃(ms)
- `MAX_LLM_REVIEWS`(선택, 기본 `180`): 대용량 안정성을 위한 AI 고급분석 최대 대상 수 (초과분은 일반분석)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: 로그인/회원가입(Supabase Auth) 용도.
- `SUPABASE_SERVICE_ROLE_KEY`: 있으면 분석 결과를 DB에 저장합니다(없으면 저장 없이 동작).
  - 주의: `SERVICE_ROLE_KEY`는 서버 전용 키입니다(클라이언트에 노출 금지).
- Paddle 월결제(선택):
  - `APP_BASE_URL`: 앱 도메인(예: `https://reviewboost.co.kr`)
  - `PADDLE_ENV` (`sandbox` 또는 `live`)
  - `NEXT_PUBLIC_PADDLE_TOKEN_SANDBOX`: sandbox용 Paddle 클라이언트 토큰
  - `NEXT_PUBLIC_PADDLE_TOKEN_LIVE`: live용 Paddle 클라이언트 토큰
  - `NEXT_PUBLIC_PADDLE_TOKEN`: 레거시 호환용(권장: 위 env별 키 우선)
  - `PADDLE_API_KEY`
  - `PADDLE_WEBHOOK_SECRET`
  - `PADDLE_BASIC_PRICE_ID`, `PADDLE_PRO_PRICE_ID`
  - 웹훅 엔드포인트: `/api/billing/webhook`

## 월결제 연동

- 결제 시작: `POST /api/billing/checkout`
- 가격 페이지(`/pricing`)에서 Basic/Pro 결제를 시작할 수 있습니다.
- 플랜 판정은 구독 상태(`subscriptions` 테이블)의 `active/trialing/past_due`를 사용합니다.

## 개발자 테스트: AI 고급옵션 vs 일반분석

로컬에서 `.env.local`에 아래 값을 넣고 `npm run dev`를 재시작하면 됩니다.

1) 무료 플랜에서도 AI 고급옵션 토글을 보이게/허용하기
```bash
DEV_ALLOW_ADVANCED_AI=1
```

2) 분석 모드 강제 실행
```bash
# 기본: UI 토글(useLLM)대로 동작
DEV_FORCE_ANALYSIS_MODE=auto

# 항상 일반분석(휴리스틱)만 실행
DEV_FORCE_ANALYSIS_MODE=heuristic

# 항상 AI 고급분석(LLM) 시도
DEV_FORCE_ANALYSIS_MODE=llm
```

주의:
- `DEV_FORCE_ANALYSIS_MODE=llm`은 `OPENAI_API_KEY`가 없으면 LLM 분류가 수행되지 않고 기본(휴리스틱) 결과로 fallback 됩니다.
- 위 변수는 개발/테스트 전용입니다. 운영에서는 설정하지 마세요.

## PDF 한글 폰트

PDFKit fallback 모드에서 한글이 깨지면 아래 둘 중 하나를 선택하세요.

1) 프로젝트에 폰트 파일 추가(추천)
- 한글 폰트(예: Noto Sans KR Regular)를 `assets/fonts/NotoSansKR-Regular.otf` (또는 .ttf)로 넣기

2) 시스템 폰트 설치(리눅스)
- `sudo apt-get update && sudo apt-get install -y fonts-noto-cjk`
- 또는 환경변수 `REPORT_FONT_PATH`에 한글 폰트 파일 경로를 지정

## Auth (로그인/회원가입)

- 페이지: `/login`, `/signup`
- Supabase Dashboard에서 Email provider를 활성화해야 합니다.
- 히스토리/상세: `/dashboard/history`, `/dashboard/analysis/[id]`

## Supabase

- 테이블 정의: `supabase/schema.sql`
  - 포함: analyses/reviews 테이블 + RLS 정책(본인 데이터만 조회/삭제)

## 설정 파일(.env) 운영 가이드

- 템플릿: `.env.example`
- 로컬 개발용 실제 값: `.env.local` (gitignore, **커밋/푸시 금지**)
- `SUPABASE_SERVICE_ROLE_KEY` 같은 서버 전용 키는 **클라이언트 번들에 노출되지 않게** 서버에서만 사용하세요.

## CI (GitHub Actions)

- `main`, `staging` 푸시 / PR 시 자동으로 `npm ci` → `lint` → `typecheck` → `test` → `build`를 실행합니다.
- CI에서는 `PUPPETEER_SKIP_DOWNLOAD=1`로 Chromium 다운로드를 생략합니다(빌드/정적 검사 목적).

## Deployment 운영 문서

- 체크리스트: `docs/deployment-checklist.md`
- 브랜치/배포 플로우: `docs/branch-deployment-flow.md`
- CI/CD 가드레일: `docs/ci-cd-guardrails.md`
