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
- 쿠팡/스마트스토어 상품 URL 기반 리뷰 CSV 다운로드 (`/coupang-csv`, 외부 crawler 연동)
- 요약 리포트 PDF 다운로드
  - 기본: Puppeteer(HTML 렌더링)
  - Puppeteer 실패 시 PDFKit 텍스트 기반 폴백 자동 전환 (운영/권장 설정에서 활성화)
  - 브라우저 렌더링에서 한글/아이콘/그래픽 보존이 핵심입니다.

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

Vercel 배포:
- GitHub 연동으로 `staging`/`main` 브랜치 push 시 Vercel이 자동으로 배포합니다.
- PR 생성 시 Preview 배포 URL이 자동 생성됩니다.
- 환경은 Vercel 콘솔에서 `Production`(main)와 `Preview/Staging`(staging)로 분리합니다.

필요 시 Vercel CLI 또는 GitHub Action 기반 수동 배포 절차는 별도 운영 가이드에 추가하세요.

- `npm run dev`: `3001`
- `npm run start`: `3000`

## 샘플 CSV

- `examples/sample.csv`

## 환경변수

- `OPENAI_API_KEY`: 있으면 LLM 기반 개선 제안이 더 정교해집니다. 없으면 템플릿 기반으로 fallback 합니다.
- (선택) 대시보드에서 `LLM 고급 분석`을 켜면 감성/카테고리 분류에도 OpenAI를 사용합니다.
- `OPENAI_CLASSIFY_TIMEOUT_MS`(선택, 기본 `12000`): LLM 분류 요청 타임아웃(ms)
- `OPENAI_CLASSIFY_BATCH_SIZE`(선택, 기본 `60`): LLM 분류 배치 크기
- `OPENAI_CLASSIFY_MAX_CONCURRENCY`(선택, 기본 `2`): LLM 분류 배치 동시 실행 수(상한 10)
- `OPENAI_SUGGEST_TIMEOUT_MS`(선택, 기본 `12000`): 제안 생성 요청 타임아웃(ms)
- `MAX_LLM_REVIEWS`(선택, 기본 `180`): 대용량 안정성을 위한 AI 고급분석 최대 대상 수 (초과분은 일반분석)
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`: 로그인/회원가입(Supabase Auth) 용도.
- `SUPABASE_SERVICE_ROLE_KEY`: 있으면 분석 결과를 DB에 저장합니다(없으면 저장 없이 동작).
  - 주의: `SERVICE_ROLE_KEY`는 서버 전용 키입니다(클라이언트에 노출 금지).
- `/api/analyze` 응답 `payload.meta`에는 `llmApplied`/`aiFallbackReason`이 추가됩니다.
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
- 쿠팡 crawler 연동(선택):
  - 요청 형식: `POST { url, limit }`
  - `COUPANG_CRAWLER_BASE_URL` (필수)
  - `COUPANG_CRAWLER_DOWNLOAD_PATH` (기본 `/api/coupang/reviews/csv`)
  - `COUPANG_CRAWLER_TIMEOUT_MS` (기본 `30000`)
  - `COUPANG_CRAWLER_LIMIT` (기본 `100`)
  - `COUPANG_CRAWLER_AUTH_HEADER_NAME`, `COUPANG_CRAWLER_AUTH_HEADER_VALUE`
  - `COUPANG_CRAWLER_AUTH_TOKEN` (`X-ReviewBoost-Token` 헤더로 항상 전송)
  - `COUPANG_CRAWLER_PRODUCT_URL_FIELD` (기본 `url`)
  - `COUPANG_CRAWLER_EXTRA_BODY_JSON` (추가 파라미터 JSON)
  - 운영 주소는 코드에 하드코딩하지 말고 배포 환경변수/시크릿으로만 주입하세요.

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

## PDF 생성 운영 가이드

최근 배포는 브라우저 렌더링(Puppeteer) 실패 시 텍스트 기반 폴백으로 이어져 텍스트 PDF가 내려가는 방식에서, 현재는 `PDFKit` 폴백을 이용해 기본 형태를 보장하도록 구성했습니다.

### 배포 점검 체크리스트(리포트)
- `x-report-renderer` 확인:
  - 기본 목표: `puppeteer`
  - 보조: `pdfkit-fallback`(일시적 Puppeteer 실패 케이스)
  - 최종 실패: `puppeteer-failed`
- `x-puppeteer-error` 및 `x-report-fallback-error` 로그 확인:
  - `puppeteer-fallback`만 반복되면 `PUPPETEER_EXECUTABLE_PATH`/`PUPPETEER_MAX_RETRIES`/타임아웃 이슈를 의심
  - `x-report-fallback-error`에 폰트 메시지가 있으면 `assets/fonts` 또는 `REPORT_FONT_PATH` 점검
- `REPORT_REQUIRE_PUPPETEER_STYLE=1`일 때는 Puppeteer fallback이 차단되어 501이 정상 동작하는지 확인

- 응답 헤더 `x-report-renderer` 값으로 경로를 확인하세요.
  - `puppeteer`: Puppeteer로 PDF 생성 성공
  - `pdfkit-fallback`: Puppeteer 실패 후 PDFKit 폴백 성공
  - `puppeteer-failed`: 두 렌더러 모두 실패(다운로드 실패)
- `x-puppeteer-error`: Puppeteer 실패 원문(가능한 경우)
- `x-report-fallback-error`: PDFKit 폴백 실패 원문(가능한 경우)
- 폴백 사용/해제는 `REPORT_ENABLE_PDFKIT_FALLBACK`(기본값 `1`)로 제어합니다.
- 한글 폰트가 없어 깨질 경우 `REPORT_FONT_PATH` 또는 `assets/fonts`에 한글 폰트를 배치하세요.
- Puppeteer 실행 보조 환경변수:
  - `PUPPETEER_EXECUTABLE_PATH`
  - `PUPPETEER_LAUNCH_TIMEOUT_MS` (기본값 `120000`)
  - `PUPPETEER_MAX_RETRIES` (기본값 `2`)
  - `REPORT_REQUIRE_PUPPETEER_STYLE=1`은 텍스트-only 폴백을 막고 501 우선 정책으로 전환

### 서버에서 자주 나오는 Puppeteer 에러

- `libatk-1.0.so.0`가 없다는 에러
  - Ubuntu/Debian 기준:
    ```bash
    sudo apt-get update
    sudo apt-get install -y \
      fonts-noto-cjk \
      libatk1.0-0 libatk-bridge2.0-0 libnss3 libx11-xcb1 libxcomposite1 \
      libxdamage1 libxrandr2 libgbm1 libasound2 libxshmfence1 libxss1 \
      libx11-6 libxext6 libgtk-3-0
    ```
  - 컨테이너(예: Debian slim)에서는 위 패키지명이 다를 수 있으므로 base image에 맞춰 조정하세요.

- `PUPPETEER_SKIP_DOWNLOAD=1`가 운영 컨테이너에도 적용되어 있으면 브라우저 바이너리가 없을 수 있습니다.
  - 운영에서는 `puppeteer`의 번들 Chrome 사용을 허용하거나, 시스템 Chrome 경로를 `PUPPETEER_EXECUTABLE_PATH`로 지정하세요.
- 배포 런타임(특히 Vercel)에서는 기본적으로 런타임 `PUPPETEER_SKIP_DOWNLOAD=1`을 설정하지 마세요.
- Vercel/컨테이너 환경에서는 build/install 단계에서 다음을 실행해 브라우저를 보장하세요.
  - `npm run puppeteer-install` (또는 동일하게 `npx puppeteer browsers install chrome`)
  - 필요 시 `PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome` 등으로 경로를 고정하세요.
- 서버 라이브러리 의존성 누락 시 Puppeteer가 바로 실패하므로 다음 라이브러리 설치를 점검하세요.
  - `libatk-1.0-0`, `libatk-bridge2.0-0`, `libnss3`, `libx11-xcb1`, `libxcomposite1`,
    `libxdamage1`, `libxrandr2`, `libgbm1`, `libasound2`, `libxshmfence1`, `libxss1`,
    `libx11-6`, `libxext6`, `libgtk-3-0`  

## Auth (로그인/회원가입)

- 페이지: `/login`, `/signup`
- Supabase Dashboard에서 Email provider를 활성화해야 합니다.
- 히스토리/상세: `/dashboard/history`, `/dashboard/analysis/[id]`

## Supabase

- 테이블 정의: `supabase/schema.sql`
  - 포함: analyses/reviews 테이블 + RLS 정책(본인 데이터만 조회/삭제)
- 신규 환경:
  - `supabase/schema.sql` 전체를 적용하면 됩니다.
- 기존 운영 환경 업그레이드:
  - 저장된 분석 상세 화면을 정상적으로 쓰려면 `public.analyses.result_payload jsonb` 컬럼이 있어야 합니다.
  - Supabase SQL Editor에서 `supabase/fix_missing_analysis_result_payload.sql`을 실행하세요.
  - migration 기반으로 관리 중이면 `supabase/migrations/20260331102000_add_analysis_result_payload.sql`을 적용해도 됩니다.
- 변경 내용:
  - `public.analyses.result_payload jsonb null`
- 확인 방법:
  - SQL Editor에서 아래 조회 결과에 `result_payload`가 나오면 반영 완료입니다.
    ```sql
    select column_name, data_type, is_nullable
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'analyses'
      and column_name = 'result_payload';
    ```
- 참고:
  - 미적용 상태에서도 앱은 기본 요약 저장으로 폴백하지만, 확장 상세(`result_payload`)는 저장되지 않습니다.
  - 컬럼 적용 후 생성되는 새 분석부터 상세 결과가 함께 저장됩니다.

## 설정 파일(.env) 운영 가이드

- 템플릿: `.env.example`
- 로컬 개발용 실제 값: `.env.local` (gitignore, **커밋/푸시 금지**)
- `SUPABASE_SERVICE_ROLE_KEY` 같은 서버 전용 키는 **클라이언트 번들에 노출되지 않게** 서버에서만 사용하세요.

## CI (GitHub Actions)

- `main`, `staging` 푸시 / PR 시 자동으로 `npm ci` → `lint` → `typecheck` → `test` → `build`를 실행합니다.
- CI에서는 `PUPPETEER_SKIP_DOWNLOAD=1`로 Chromium 다운로드를 생략합니다(빌드/정적 검사 목적).
- 배포는 GitHub Actions가 아니라 Vercel Git Integration이 담당합니다.
- 수동 배포가 필요할 때는 `.github/workflows/vercel-manual-deploy.yml`의 `workflow_dispatch`를 사용하세요.
- 수동 배포 시 필요한 Secret:
  - `VERCEL_TOKEN`
  - `VERCEL_ORG_ID`
  - `VERCEL_PROJECT_ID`

## Deployment 운영 문서

- 체크리스트: `docs/deployment-checklist.md`
- 브랜치/배포 플로우: `docs/branch-deployment-flow.md`
- CI/CD 가드레일: `docs/ci-cd-guardrails.md`

## PDF 한글 폰트 복구(운영권장)

- Vercel 배포에서는 `assets/fonts/NotoSansKR-Regular.ttf` 또는 `.otf`를 레포에 포함해 번들로 같이 배포되도록 설정하세요.
- `REPORT_FONT_PATH`는 대체 경로로만 사용하고, 기본 동작은 `assets/fonts` 자동 탐색입니다.
- `x-report-renderer=puppeteer-failed` + `x-report-fallback-error`가 `PDFKit 한글 폰트 미설치`로 오면 해당 요청은 PDFKit 폰트 미존재로 fail-closed 처리된 상태입니다.
- 정상 폰트 반영 시 `x-report-renderer=pdfkit-fallback` + 깨짐 없는 텍스트 PDF를 기대하세요.
