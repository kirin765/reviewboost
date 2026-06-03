# Clerk + Neon 마이그레이션 설계 (Supabase 제거)

날짜: 2026-06-03
브랜치: `migrate/clerk-neon`
전제: **clean slate** — 운영 중인 실데이터/실사용자 없음. 데이터·Auth 사용자 이전 없음.

## 목표

Supabase(Auth + DB)를 들어내고 인증은 **Clerk**, 데이터베이스는 **Neon(Postgres) + Drizzle ORM**로 교체한다. Resend는 코드에 미사용이므로 별도 제거 작업 없음. Paddle 빌링은 유지하되 사용자 식별자를 Clerk ID로 전환한다.

## 비목표 (이번 범위 아님)

- 쿠팡 URL → 리뷰 수집 기능 (별도 스펙)
- 리뷰 분석 퀄리티 개선 (별도 스펙)
- 데이터/사용자 마이그레이션 (clean slate라 불필요)
- 새 결제 플랜·가격 변경

## 아키텍처

### 인증 — Clerk (Vercel Marketplace integration)

- Vercel 대시보드에서 Clerk integration 연결 → `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` 자동 주입.
- `middleware.ts`: Supabase 세션 갱신 로직 제거 → `clerkMiddleware()`. 보호 매처:
  - `/dashboard(.*)`
  - `/api/(analyze|report|billing|capabilities)(.*)` (단, Paddle 웹훅 `/api/billing/webhook`은 공개 — 서명 검증으로 보호)
  - 기존 `/help` → `/help-checklist` rewrite 규칙은 유지.
- 인증 UI: `src/app/(auth)/login`·`signup`·`forgot-password`를 Clerk `<SignIn/>`·`<SignUp/>`로 교체. UI가 한국어이므로 `<ClerkProvider localization={koKR}>` 적용. 기존 signup 일시중단 배너는 제거(clean slate, 신규 가입 재개).
- 삭제: `src/app/(auth)/actions.ts`(수동 auth 액션), `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts`.
- 현재 사용자 획득: 서버/API에서 Clerk `auth()`로 `userId`(string), 필요 시 `currentUser()`로 email. `src/lib/navigation_session.ts`의 `getNavigationSessionState()`를 Clerk 기반으로 재작성.

### 데이터베이스 — Neon + Drizzle ORM

- Neon을 Vercel Marketplace로 연결 → `DATABASE_URL` 자동 주입.
- 드라이버: `@neondatabase/serverless` + `drizzle-orm`. 마이그레이션: `drizzle-kit`.
- 스키마 위치: `src/lib/db/schema.ts` (Drizzle), 생성 SQL은 `drizzle-kit`로 관리. 기존 `supabase/schema.sql`은 삭제.
- 테이블 4개 재정의: `analyses`, `reviews`, `profiles`, `subscriptions`.
  - **RLS 제거.** Neon은 JWT 기반 RLS 미사용.
  - `user_id` 타입: `uuid` → `text` (Clerk user ID).
  - 기존 컬럼/관계(분석↔리뷰 FK, profiles.paddle_customer_id, subscriptions 필드)는 그대로 유지.
- **권한 격리는 앱 레벨에서 강제**: 모든 사용자 데이터 쿼리는 반드시 `where user_id = <clerk userId>` 포함. 단일 DB 접근 헬퍼(`src/lib/db/index.ts`)를 통해서만 접근하고, 사용자 스코프 쿼리는 userId를 필수 인자로 받는 함수로 노출해 누락을 구조적으로 방지.

### DB 접근 레이어

- `src/lib/db/index.ts`: Drizzle 클라이언트 + 환경변수 없을 때 null 반환(graceful degradation).
- `src/lib/supabase/*`, `src/lib/supabase_server.ts` 삭제.
- 교체 대상 쿼리 지점:
  - `src/lib/billing.ts` — `subscriptions`/`profiles` select·upsert.
  - `src/app/api/analyze/_helpers/persistence.ts` — `analyses`/`reviews` insert.
  - `src/app/api/report/[id]/route.ts` — `analyses`/`reviews` select (+ userId 소유 검증).
  - `src/app/dashboard/page.tsx` — `analyses` 목록 조회 (userId 스코프).

### 빌링 — Paddle (유지)

- `subscriptions.user_id`, `profiles.user_id`를 Clerk ID(text)로 저장.
- `src/app/api/billing/webhook/route.ts`: 서명 검증 후 upsert. 조회/저장 키만 Clerk ID로.
- `src/lib/plan.ts` / `billing.ts` 로직 유지, 쿼리만 Drizzle로 교체. 이메일 기반 플랜 오버라이드(`PLAN_PRO_EMAILS` 등)는 그대로.

### Graceful degradation

- 기존 "Supabase 없어도 동작" 패턴 유지:
  - Clerk env 없으면 → 게스트 모드(로그인 불가하지만 분석 미리보기 등 공개 기능 동작).
  - `DATABASE_URL` 없으면 → 저장/히스토리 비활성, 분석 자체는 동작.

## 환경 변수 변경

추가:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (Clerk integration)
- `DATABASE_URL` (Neon integration)

제거:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

유지: 모든 `PADDLE_*`, `NEXT_PUBLIC_PADDLE_*`, `PLAN_*_EMAILS`, OpenAI 관련.

`.env.example` 갱신.

## 패키지 변경

- 추가: `@clerk/nextjs`, `@clerk/localizations`, `drizzle-orm`, `@neondatabase/serverless`, `drizzle-kit`(dev).
- 제거: `@supabase/ssr`, `@supabase/supabase-js`.

## 검증 기준

- `npm run lint` 통과, `npm run build` 통과 (CI와 동일).
- Supabase import가 코드베이스에서 0건 (`grep -r "supabase" src/`).
- 로컬에서: 비로그인 → `/dashboard` 접근 시 Clerk 로그인으로 리다이렉트. 로그인 후 분석 1건 실행 → Neon `analyses`/`reviews`에 저장 → 히스토리에 노출 → 다른 사용자로는 안 보임(소유 격리 확인).
- Paddle 웹훅(샌드박스) 수신 → `subscriptions` upsert → 플랜 티어 반영.

## 리스크 / 주의

- **소유 격리 누락**: RLS가 제공하던 안전망이 사라짐. DB 헬퍼에서 userId 필수화로 구조적 방지. 리뷰 시 모든 사용자 쿼리에 userId 필터 존재 확인 필수.
- **Clerk ID 타입**: UUID 아님(string). 외래키·인덱스 text로.
- **웹훅 공개 경로**: Clerk 미들웨어 매처에서 `/api/billing/webhook` 제외 + Paddle 서명 검증 유지.
