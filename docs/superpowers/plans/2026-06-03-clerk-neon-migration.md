# Clerk + Neon 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Supabase(Auth+DB)를 들어내고 인증은 Clerk(Vercel Marketplace), DB는 Neon Postgres + Drizzle ORM으로 교체한다. clean slate(데이터/사용자 이전 없음).

**Architecture:** Clerk가 미들웨어·인증 UI·세션을 담당하고, 모든 사용자 데이터는 Drizzle ORM으로 Neon에 저장한다. Supabase RLS가 사라지므로 모든 사용자 스코프 쿼리는 DB 헬퍼 함수를 통해 `userId`(Clerk text ID)로 강제 필터링한다. Paddle 빌링은 유지하되 식별자를 Clerk ID로 전환한다.

**Tech Stack:** Next.js 15 App Router, `@clerk/nextjs` + `@clerk/localizations`(koKR), `drizzle-orm` + `@neondatabase/serverless` + `drizzle-kit`, TypeScript strict.

**검증 도구 메모:** 이 프로젝트는 `npm run lint`, `npm run typecheck`(next typegen + tsc), `npm run build`, vitest(`npm run test:billing-schema` 등)를 가진다. 단위테스트 인프라가 있으므로 신규 순수함수는 vitest로 테스트한다. 인증/DB I/O는 typecheck+build+grep+런타임 스모크로 검증한다.

---

## File Structure

신규:
- `src/lib/db/schema.ts` — Drizzle 테이블 정의 (analyses, reviews, profiles, subscriptions)
- `src/lib/db/index.ts` — Neon+Drizzle 클라이언트 (env 없으면 null)
- `src/lib/db/queries.ts` — userId 스코프 강제 쿼리 헬퍼
- `drizzle.config.ts` — drizzle-kit 설정
- `src/lib/db/queries.test.ts` — 순수 헬퍼 단위테스트(스코프 필터 보장)

수정:
- `middleware.ts` — Supabase 세션갱신 → clerkMiddleware
- `src/app/layout.tsx` — `<ClerkProvider localization={koKR}>` 래핑
- `src/lib/navigation_session.ts` — Clerk `auth()` 기반
- `src/lib/billing.ts` — Supabase admin → Drizzle queries
- `src/app/api/analyze/_helpers/persistence.ts` — Supabase `client.from()` → Drizzle insert
- `src/app/api/analyze/route.ts` — auth 획득 + persistence 호출부 (실행 시 정독)
- `src/app/api/report/[id]/route.ts` — Clerk auth + Drizzle 조회
- `src/app/dashboard/page.tsx` — Clerk auth + Drizzle 목록 조회 (실행 시 정독)
- `src/app/api/capabilities/route.ts` 및 `src/lib/capabilities.ts` — `supabaseConfigured` → `clerkConfigured`/`databaseConfigured` (실행 시 정독)
- `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx` — Clerk 컴포넌트
- `.env.example`, `package.json`

삭제:
- `src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/supabase/keys.ts`, `src/lib/supabase_server.ts`
- `src/app/(auth)/actions.ts`
- `src/app/auth/callback/route.ts`, `src/app/auth/confirm/route.ts`
- `supabase/schema.sql` (및 `scripts/ci/supabase-keepalive.sh` 참조 정리)

---

## Phase 0 — 의존성 & 외부 연동

### Task 0.1: Vercel Marketplace integration 연결 (수동, 코드 아님)

- [ ] **Step 1: Clerk + Neon 연결**

Vercel 대시보드 → reviewboost 프로젝트 → Integrations:
- Clerk 추가 → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` 주입 확인
- Neon 추가 → `DATABASE_URL` 주입 확인

로컬은 `.env.local`에 동일 키 3개를 수동 복사(Clerk dev instance 키 + Neon connection string).

- [ ] **Step 2: 확인**

`vercel env ls`로 세 변수 존재 확인. (없으면 이후 태스크 graceful degradation 분기로 빌드는 통과하지만 런타임 인증/저장 비활성.)

### Task 0.2: 패키지 설치/제거

**Files:** Modify `package.json`

- [ ] **Step 1: 설치**

```bash
npm install @clerk/nextjs @clerk/localizations drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

- [ ] **Step 2: Supabase 제거**

```bash
npm uninstall @supabase/ssr @supabase/supabase-js
```

- [ ] **Step 3: 확인**

Run: `grep -E "@supabase|@clerk|drizzle|neondatabase" package.json`
Expected: `@clerk/*`, `drizzle-orm`, `drizzle-kit`, `@neondatabase/serverless` 존재, `@supabase/*` 없음.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: swap supabase deps for clerk + drizzle/neon"
```

---

## Phase 1 — DB 레이어 (Neon + Drizzle)

### Task 1.1: Drizzle 스키마 정의

**Files:** Create `src/lib/db/schema.ts`

기존 `supabase/schema.sql`을 미러링하되 `user_id`는 `text`(Clerk ID), `auth.users` FK 제거, RLS 없음.

- [ ] **Step 1: 스키마 작성**

```typescript
import { pgTable, uuid, text, integer, numeric, jsonb, timestamp, boolean, index } from "drizzle-orm/pg-core";

export const analyses = pgTable(
  "analyses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    clientIp: text("client_ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    inputFilename: text("input_filename"),
    stats: jsonb("stats").notNull(),
    suggestions: jsonb("suggestions").notNull(),
    resultPayload: jsonb("result_payload"),
    priorityScore: numeric("priority_score").notNull().default("0")
  },
  (t) => ({
    userCreatedIdx: index("analyses_user_id_created_at_idx").on(t.userId, t.createdAt)
  })
);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    analysisId: uuid("analysis_id")
      .notNull()
      .references(() => analyses.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    rating: integer("rating"),
    text: text("text").notNull(),
    sentiment: text("sentiment").notNull(),
    category: text("category").notNull()
  },
  (t) => ({
    analysisIdx: index("reviews_analysis_id_idx").on(t.analysisId)
  })
);

export const profiles = pgTable("profiles", {
  userId: text("user_id").primaryKey(),
  paddleCustomerId: text("paddle_customer_id").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    paddleCustomerId: text("paddle_customer_id").notNull(),
    paddleSubscriptionId: text("paddle_subscription_id").notNull().unique(),
    paddlePriceId: text("paddle_price_id"),
    status: text("status").notNull(),
    planTier: text("plan_tier").notNull().default("free"),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (t) => ({
    userIdx: index("subscriptions_user_id_idx").on(t.userId),
    customerIdx: index("subscriptions_customer_id_idx").on(t.paddleCustomerId)
  })
);
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS (스키마만 추가, 미사용이라도 타입 오류 없음).

### Task 1.2: Drizzle 클라이언트 (graceful degradation)

**Files:** Create `src/lib/db/index.ts`

- [ ] **Step 1: 작성**

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

let cached: ReturnType<typeof drizzle> | null | undefined;

export function getDb() {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    cached = null;
    return cached;
  }
  cached = drizzle(neon(url), { schema });
  return cached;
}

export { schema };
export type Db = NonNullable<ReturnType<typeof getDb>>;
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/db/schema.ts src/lib/db/index.ts
git commit -m "feat: add drizzle schema + neon client"
```

### Task 1.3: drizzle-kit 설정 + 스키마 push

**Files:** Create `drizzle.config.ts`

- [ ] **Step 1: 설정 작성**

```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" }
} satisfies Config;
```

- [ ] **Step 2: package.json 스크립트 추가**

`scripts`에 추가:
```json
"db:generate": "drizzle-kit generate",
"db:push": "drizzle-kit push"
```

- [ ] **Step 3: Neon에 스키마 생성**

Run: `DATABASE_URL="<neon-url>" npm run db:push`
Expected: 4테이블 생성 성공. (Neon 콘솔에서 테이블 확인.)

- [ ] **Step 4: Commit**

```bash
git add drizzle.config.ts package.json drizzle/
git commit -m "feat: drizzle-kit config + initial migration"
```

### Task 1.4: userId 스코프 쿼리 헬퍼

**Files:** Create `src/lib/db/queries.ts`, `src/lib/db/queries.test.ts`

모든 사용자 데이터 접근은 여기를 통해서만. 함수 시그니처가 `userId`를 필수로 받게 해 RLS 부재로 인한 누수를 구조적으로 방지.

- [ ] **Step 1: 실패 테스트 작성 (스코프 필터 보장)**

```typescript
import { describe, it, expect } from "vitest";
import { buildAnalysisListQueryFilter } from "./queries";

describe("buildAnalysisListQueryFilter", () => {
  it("always includes the userId in the filter description", () => {
    const f = buildAnalysisListQueryFilter("user_abc");
    expect(f.userId).toBe("user_abc");
  });

  it("rejects empty userId", () => {
    expect(() => buildAnalysisListQueryFilter("")).toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run src/lib/db/queries.test.ts`
Expected: FAIL ("buildAnalysisListQueryFilter is not a function").

- [ ] **Step 3: queries.ts 구현**

```typescript
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "./index";
import { analyses, reviews, profiles, subscriptions } from "./schema";

function requireUserId(userId: string) {
  if (!userId || !userId.trim()) throw new Error("userId is required for scoped query");
  return userId;
}

// Exported for unit testing the scope guard.
export function buildAnalysisListQueryFilter(userId: string) {
  return { userId: requireUserId(userId) };
}

export async function listAnalysesForUser(userId: string, limit = 50) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return [];
  return db
    .select({
      id: analyses.id,
      createdAt: analyses.createdAt,
      inputFilename: analyses.inputFilename,
      stats: analyses.stats,
      priorityScore: analyses.priorityScore
    })
    .from(analyses)
    .where(eq(analyses.userId, uid))
    .orderBy(desc(analyses.createdAt))
    .limit(limit);
}

export async function getAnalysisForUser(analysisId: string, userId: string) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select({
      id: analyses.id,
      createdAt: analyses.createdAt,
      inputFilename: analyses.inputFilename,
      stats: analyses.stats,
      suggestions: analyses.suggestions
    })
    .from(analyses)
    .where(and(eq(analyses.id, analysisId), eq(analyses.userId, uid)))
    .limit(1);
  return rows[0] ?? null;
}

export async function countAnalysesForUserSince(userId: string, sinceIso: string) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return 0;
  const rows = await db.select({ id: analyses.id }).from(analyses).where(eq(analyses.userId, uid));
  return rows.filter((r) => true).length; // 월간 카운트는 호출부에서 sinceIso로 필터 (Task 3.x 참고)
}

export async function insertAnalysisForUser(record: {
  userId: string;
  clientIp: string | null;
  inputFilename: string | null;
  stats: unknown;
  suggestions: unknown;
  resultPayload?: unknown;
  priorityScore: number;
}) {
  const uid = requireUserId(record.userId);
  const db = getDb();
  if (!db) return null;
  const rows = await db
    .insert(analyses)
    .values({
      userId: uid,
      clientIp: record.clientIp,
      inputFilename: record.inputFilename,
      stats: record.stats as any,
      suggestions: record.suggestions as any,
      resultPayload: (record.resultPayload ?? null) as any,
      priorityScore: String(record.priorityScore)
    })
    .returning({ id: analyses.id });
  return rows[0]?.id ?? null;
}

export async function insertReviewsForAnalysis(
  analysisId: string,
  rows: Array<{
    rating: number | null;
    text: string;
    sentiment: string;
    category: string;
    reviewedAt: string | null;
  }>
) {
  const db = getDb();
  if (!db || rows.length === 0) return;
  await db.insert(reviews).values(
    rows.map((r) => ({
      analysisId,
      rating: r.rating,
      text: r.text,
      sentiment: r.sentiment,
      category: r.category,
      reviewedAt: r.reviewedAt ? new Date(r.reviewedAt) : null
    }))
  );
}

export { analyses, reviews, profiles, subscriptions, getDb, and, eq };
```

> 주의: `countAnalysesForUserSince`의 정확한 월간 카운트 SQL은 Task 3.4에서 `gte(analyses.createdAt, new Date(sinceIso))`로 마무리한다(현재 analyze 라우트의 월간 제한 로직 정독 후).

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run src/lib/db/queries.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/db/queries.ts src/lib/db/queries.test.ts
git commit -m "feat: userId-scoped drizzle query helpers"
```

---

## Phase 2 — 인증 (Clerk)

### Task 2.1: ClerkProvider + koKR 로컬라이제이션

**Files:** Modify `src/app/layout.tsx` (실행 시 정독)

- [ ] **Step 1: layout 정독**

Run: `cat src/app/layout.tsx`
루트 `<html>`/`<body>` 구조 확인.

- [ ] **Step 2: ClerkProvider 래핑**

import 추가:
```typescript
import { ClerkProvider } from "@clerk/nextjs";
import { koKR } from "@clerk/localizations";
```
최상위 반환 JSX를 `<ClerkProvider localization={koKR}>...</ClerkProvider>`로 감싼다(기존 `<html>` 바깥). Clerk env가 없으면 dev에서 throw할 수 있으므로, 키 미설정 환경 대응으로 `publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}`를 명시하고 키 없을 때는 Provider를 생략하는 분기를 둔다:

```tsx
const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const body = (<html lang="ko">{/* 기존 내용 */}</html>);
return clerkKey ? <ClerkProvider localization={koKR}>{body}</ClerkProvider> : body;
```

- [ ] **Step 3: typecheck + build**

Run: `npm run typecheck`
Expected: PASS.

### Task 2.2: clerkMiddleware

**Files:** Modify `middleware.ts`

기존 `isPublicPath` 화이트리스트 + `/term`,`/help-checklist` 리다이렉트 + 보안헤더는 유지. Supabase 세션갱신 블록만 Clerk 보호로 교체.

- [ ] **Step 1: 교체**

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { applySecurityHeaders } from "@/lib/security";

function withSecurity(response: NextResponse) {
  applySecurityHeaders(response.headers);
  return response;
}

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/api/analyze(.*)",
  "/api/report(.*)",
  "/api/capabilities(.*)",
  "/api/billing/portal(.*)",
  "/api/billing/checkout(.*)"
  // NOTE: /api/billing/webhook 는 공개 — Paddle 서명검증으로 보호
]);

export default clerkMiddleware(async (auth, request: NextRequest) => {
  if (request.nextUrl.pathname === "/term") {
    const url = request.nextUrl.clone();
    url.pathname = "/terms";
    return withSecurity(NextResponse.redirect(url, 301));
  }
  if (request.nextUrl.pathname === "/help-checklist") {
    const url = request.nextUrl.clone();
    url.pathname = "/help/csv-checklist";
    return withSecurity(NextResponse.redirect(url, 301));
  }

  if (isProtectedRoute(request) && process.env.CLERK_SECRET_KEY) {
    await auth.protect();
  }
  return withSecurity(NextResponse.next());
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json|sample\\.csv|sample_simple\\.csv).*)"]
};
```

> `auth.protect()`를 `CLERK_SECRET_KEY` 존재 시에만 호출 → 키 미설정(로컬/CI) 환경에서 빌드·접근이 깨지지 않음(graceful degradation).
> 실제 빌링 라우트 경로는 실행 시 `ls src/app/api/billing`로 확인 후 매처 조정.

- [ ] **Step 2: build**

Run: `npm run build`
Expected: PASS (미들웨어 컴파일 성공).

- [ ] **Step 3: Commit**

```bash
git add middleware.ts src/app/layout.tsx
git commit -m "feat: clerk middleware + provider (koKR)"
```

### Task 2.3: 인증 UI를 Clerk 컴포넌트로 교체

**Files:** Modify `src/app/(auth)/login/page.tsx`, `signup/page.tsx`, `forgot-password/page.tsx` (각각 실행 시 정독)

- [ ] **Step 1: login 페이지**

기존 폼/`signInAction` 호출 제거 후 Clerk `<SignIn/>`로 교체:
```tsx
import { SignIn } from "@clerk/nextjs";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <SignIn signUpUrl="/signup" />
    </div>
  );
}
```

- [ ] **Step 2: signup 페이지 (약관 동의 보존)**

기존 일시중단 배너 제거(clean slate, 가입 재개). Clerk `<SignUp/>`로 교체하고, 한국 법규상 필수 동의는 Clerk Dashboard의 Legal consent(`legalAccepted`) 기능을 켜서 약관/개인정보 동의 체크박스를 노출:
```tsx
import { SignUp } from "@clerk/nextjs";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <SignUp signInUrl="/login" />
    </div>
  );
}
```
> Clerk Dashboard → User & Authentication → Legal consent 활성화. 마케팅 수신 동의(선택)는 이번 범위에서 제외(추후 unsafeMetadata로 수집 가능 — 비목표).

- [ ] **Step 3: forgot-password 페이지**

Clerk `<SignIn/>`이 비밀번호 재설정 플로우를 내장하므로, 별도 forgot-password는 `/login`(또는 `/sign-in`)으로 redirect 처리하거나 안내 페이지로 단순화:
```tsx
import { redirect } from "next/navigation";
export default function ForgotPasswordPage() {
  redirect("/login");
}
```

- [ ] **Step 4: Clerk 경로 환경변수 (선택)**

`.env.local`/Vercel에 추가(컴포넌트 라우팅 일관성):
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

- [ ] **Step 5: 삭제 — 수동 auth 플로우**

```bash
git rm src/app/(auth)/actions.ts src/app/auth/callback/route.ts src/app/auth/confirm/route.ts
```
삭제 후 깨진 import 확인:
Run: `grep -rn "(auth)/actions\|auth/callback\|auth/confirm\|signInAction\|signUpAction\|requestPasswordResetAction\|signOutAction" src/`
Expected: 0건 (있으면 해당 호출부를 Clerk `<SignOutButton/>`/`<UserButton/>` 또는 redirect로 교체).

- [ ] **Step 6: 로그아웃 버튼 교체**

`signOutAction`을 쓰던 UI(예: 대시보드 헤더)를 Clerk `<UserButton/>` 또는 `<SignOutButton>`로 교체. 위치는 Step 5 grep 결과로 특정.

- [ ] **Step 7: build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: replace supabase auth UI/actions with clerk components"
```

### Task 2.4: navigation_session을 Clerk 기반으로

**Files:** Modify `src/lib/navigation_session.ts`

- [ ] **Step 1: 교체**

```typescript
import { auth, currentUser } from "@clerk/nextjs/server";
import { resolvePlanTierForUser, type PlanTier } from "@/lib/plan";

export type NavigationSessionState = {
  authenticated: boolean;
  userId: string | null;
  userEmail: string | null;
  plan: PlanTier;
};

export async function getNavigationSessionState(): Promise<NavigationSessionState> {
  let userId: string | null = null;
  let userEmail: string | null = null;
  let plan: PlanTier = "free";

  try {
    if (process.env.CLERK_SECRET_KEY) {
      const { userId: uid } = await auth();
      userId = uid ?? null;
      if (userId) {
        const user = await currentUser();
        userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
        plan = await resolvePlanTierForUser({ userId, email: userEmail });
      }
    }
  } catch {
    // Non-auth environments keep the sidebar in guest mode.
  }

  return { authenticated: Boolean(userId), userId, userEmail, plan };
}
```

- [ ] **Step 2: typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/navigation_session.ts
git commit -m "feat: navigation session via clerk auth"
```

---

## Phase 3 — DB 호출부 교체

### Task 3.1: billing.ts → Drizzle

**Files:** Modify `src/lib/billing.ts`

순수함수(`billingToIso`, `normalizeSubscriptionStatus`, 정렬 로직 등)는 전부 유지. Supabase `admin.from(...)` 호출 4곳만 Drizzle로 교체.

- [ ] **Step 1: import 교체**

`import { getSupabaseAdminClient } from "@/lib/supabase_server";` 제거.
추가:
```typescript
import { getDb } from "@/lib/db";
import { profiles, subscriptions } from "@/lib/db/schema";
import { and, eq, isNull } from "drizzle-orm";
```

- [ ] **Step 2: `resolvePlanTierByBilling` 교체**

`getSupabaseAdminClient()`/`admin.from("subscriptions").select(...).eq("user_id", userId)`를 다음으로:
```typescript
const db = getDb();
if (!db) return args.fallbackPlan;

let dataToEvaluate = await db
  .select({
    plan_tier: subscriptions.planTier,
    status: subscriptions.status,
    current_period_start: subscriptions.currentPeriodStart,
    current_period_end: subscriptions.currentPeriodEnd,
    updated_at: subscriptions.updatedAt,
    paddle_subscription_id: subscriptions.paddleSubscriptionId
  })
  .from(subscriptions)
  .where(eq(subscriptions.userId, userId))
  .limit(50);

if (dataToEvaluate.length === 0) {
  const paddleCustomerId = await findPaddleCustomerIdByUserId(userId);
  if (paddleCustomerId) {
    dataToEvaluate = await db
      .select({ /* 동일 컬럼 */ })
      .from(subscriptions)
      .where(eq(subscriptions.paddleCustomerId, paddleCustomerId))
      .limit(50);
    if (dataToEvaluate.length > 0) {
      await db
        .update(subscriptions)
        .set({ userId, updatedAt: new Date() })
        .where(and(eq(subscriptions.paddleCustomerId, paddleCustomerId), isNull(subscriptions.userId)));
    }
  }
}
```
이후 `activePaidSubscriptions` 정렬/필터 로직은 그대로 사용(필드명 `plan_tier`,`status` 등 동일 별칭 유지). timestamp 컬럼이 Date 객체로 반환되므로 `timestampToMillis`에 넘기기 전 `current_period_end?.toISOString?.() ?? null` 형태로 정규화하거나, `timestampToMillis`가 Date도 처리하도록 입력을 `String(v)`로 감싼다. 가장 안전: 셀렉트 별칭 값을 `row.current_period_end instanceof Date ? row.current_period_end.toISOString() : row.current_period_end`로 매핑.

> `subscriptions.userId`는 `notNull`이라 `isNull` 비교가 타입상 어색할 수 있음 — orphan 보정(`user_id IS NULL`)은 Neon clean slate에선 사실상 불필요하므로, 타입 충돌 시 이 보정 분기를 제거해도 된다(YAGNI).

- [ ] **Step 3: `upsertProfileCustomer` 교체**

```typescript
const db = getDb();
if (!db) return;
await db
  .insert(profiles)
  .values({ userId, paddleCustomerId, updatedAt: new Date() })
  .onConflictDoUpdate({ target: profiles.userId, set: { paddleCustomerId, updatedAt: new Date() } });
```

- [ ] **Step 4: `findUserIdByPaddleCustomerId` / `findPaddleCustomerIdByUserId` 교체**

```typescript
export async function findUserIdByPaddleCustomerId(paddleCustomerId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select({ userId: profiles.userId }).from(profiles)
    .where(eq(profiles.paddleCustomerId, paddleCustomerId)).limit(1);
  return rows[0]?.userId ?? null;
}

export async function findPaddleCustomerIdByUserId(userId: string): Promise<string | null> {
  const db = getDb();
  if (!db) return null;
  const rows = await db.select({ paddleCustomerId: profiles.paddleCustomerId }).from(profiles)
    .where(eq(profiles.userId, userId)).limit(1);
  const id = String(rows[0]?.paddleCustomerId ?? "").trim();
  return id || null;
}
```

- [ ] **Step 5: `upsertSubscription` 교체**

```typescript
const db = getDb();
if (!db) return;
await db
  .insert(subscriptions)
  .values({
    userId: args.userId,
    paddleCustomerId: args.paddleCustomerId,
    paddleSubscriptionId: args.paddleSubscriptionId,
    paddlePriceId: args.paddlePriceId ?? null,
    status: normalizeSubscriptionStatus(args.status),
    planTier: args.planTier,
    currentPeriodStart: args.currentPeriodStart ? new Date(billingToIso(args.currentPeriodStart)!) : null,
    currentPeriodEnd: args.currentPeriodEnd ? new Date(billingToIso(args.currentPeriodEnd)!) : null,
    cancelAtPeriodEnd: Boolean(args.cancelAtPeriodEnd),
    updatedAt: new Date()
  })
  .onConflictDoUpdate({
    target: subscriptions.paddleSubscriptionId,
    set: {
      userId: args.userId,
      paddleCustomerId: args.paddleCustomerId,
      paddlePriceId: args.paddlePriceId ?? null,
      status: normalizeSubscriptionStatus(args.status),
      planTier: args.planTier,
      currentPeriodStart: args.currentPeriodStart ? new Date(billingToIso(args.currentPeriodStart)!) : null,
      currentPeriodEnd: args.currentPeriodEnd ? new Date(billingToIso(args.currentPeriodEnd)!) : null,
      cancelAtPeriodEnd: Boolean(args.cancelAtPeriodEnd),
      updatedAt: new Date()
    }
  });
```

- [ ] **Step 6: typecheck + 빌링 스키마 테스트**

Run: `npm run typecheck && npm run test:billing-schema`
Expected: PASS. (`test:billing-schema`가 Supabase에 의존하면 해당 스크립트도 Drizzle/순수검증으로 수정 — `cat scripts/test-billing-schema.mjs` 확인.)

- [ ] **Step 7: Commit**

```bash
git add src/lib/billing.ts
git commit -m "feat: billing queries via drizzle/neon"
```

### Task 3.2: persistence.ts → Drizzle insert

**Files:** Modify `src/app/api/analyze/_helpers/persistence.ts`

Supabase는 `result_payload` 컬럼 부재 시 compat fallback이 필요했으나, Neon 스키마엔 항상 존재하므로 compat 분기(`insertAnalysisWithCompat`, `isResultPayloadSchemaMismatch`)는 제거하고 단순 insert로.

- [ ] **Step 1: import/시그니처 교체**

`executePersistAndRespond`의 첫 인자 `client: { from }`를 제거하고 Drizzle 헬퍼 사용:
```typescript
import { insertAnalysisForUser, insertReviewsForAnalysis } from "@/lib/db/queries";
import { createStoredAnalysisPayload } from "@/lib/saved-analysis";
```
`buildAnalysisInsertRecord`는 그대로 두되, insert는:
```typescript
const analysisId = await insertAnalysisForUser({
  userId,
  clientIp,
  inputFilename: filename,
  stats: payload.stats,
  suggestions: payload.suggestions,
  resultPayload: createStoredAnalysisPayload(payload),
  priorityScore: payload.stats.priorityScore
});
if (!analysisId) {
  storageStatus.error = `analyses_insert_${clientLabel}_no_id`;
  return null;
}
await insertReviewsForAnalysis(
  analysisId,
  classified.slice(0, 5000).map((r) => ({
    rating: r.rating, text: r.text, sentiment: r.sentiment, category: r.category, reviewedAt: r.reviewedAt ?? null
  }))
);
storageStatus.success = true;
storageStatus.analysisId = analysisId;
storageStatus.error = null;
return Response.json({ ...payload, meta: buildStorageMeta(payload.meta, storageStatus) });
```
`insertAnalysisWithCompat`, `RESULT_PAYLOAD_STORAGE_WARNING` re-export, `isResultPayloadSchemaMismatch` import 제거.

- [ ] **Step 2: 호출부(analyze route) 수정**

Run: `grep -rn "executePersistAndRespond\|createSupabaseServerActionClient\|getSupabaseAdminClient\|RESULT_PAYLOAD_STORAGE_WARNING" src/app/api/analyze`
실행 시 `src/app/api/analyze/route.ts` 정독 → `client` 인자 넘기던 부분 제거, auth는 `const { userId } = await auth();`(from `@clerk/nextjs/server`)로 교체. 게스트(미인증) 저장 경로가 있었다면 userId 없을 때 저장 스킵으로 단순화.

- [ ] **Step 3: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/analyze
git commit -m "feat: persist analyses via drizzle, drop supabase compat path"
```

### Task 3.3: report 라우트 → Clerk + Drizzle

**Files:** Modify `src/app/api/report/[id]/route.ts`

- [ ] **Step 1: auth + 조회 교체 (line 67~92 구간)**

```typescript
import { auth } from "@clerk/nextjs/server";
import { getAnalysisForUser } from "@/lib/db/queries";
```
GET 내부:
```typescript
const { userId } = await auth();
if (!userId) {
  const url = new URL(req.url);
  url.pathname = "/login";
  url.search = `next=${encodeURIComponent(`/api/report/${id}`)}`;
  return Response.redirect(url, 307);
}

const data = await getAnalysisForUser(id, userId);
if (!data) return textError(404, "분석을 찾을 수 없습니다.");

const parsed = AnalysisRecordSchema.safeParse({
  ...data,
  created_at: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
  input_filename: data.inputFilename
});
if (!parsed.success) throw new Error(parsed.error.message);
analysis = parsed.data;
```
> `getAnalysisForUser` 반환 키(camelCase)를 zod 스키마(snake_case)에 맞게 매핑. PDF 렌더링 이후 로직은 변경 없음.

- [ ] **Step 2: typecheck + report 스모크**

Run: `npm run typecheck && npm run ci:report-smoke`
Expected: PASS (스모크가 DB 접근 시 mock/skip 확인 — 실패하면 스크립트 정독 후 Clerk/Drizzle 대응).

- [ ] **Step 3: Commit**

```bash
git add src/app/api/report/[id]/route.ts
git commit -m "feat: report route via clerk + drizzle"
```

### Task 3.4: dashboard + 월간 카운트 + capabilities

**Files:** Modify `src/app/dashboard/page.tsx`, `src/lib/capabilities.ts`, `src/app/api/capabilities/route.ts` (실행 시 정독)

- [ ] **Step 1: dashboard 정독 후 교체**

Run: `cat src/app/dashboard/page.tsx`
`createSupabaseServerComponentClient()` + `auth.getUser()` + `analyses` 조회를:
```typescript
import { auth } from "@clerk/nextjs/server";
import { listAnalysesForUser } from "@/lib/db/queries";
...
const { userId } = await auth();
const items = userId ? await listAnalysesForUser(userId, 50) : [];
```
뷰 매핑은 기존 컬럼명(camelCase로 바뀜)에 맞게 조정.

- [ ] **Step 2: 월간 분석 제한 카운트**

Run: `grep -rn "monthStartIso\|monthlyLimitForPlan\|from(\"analyses\")\|count" src/app/api/analyze`
analyze 라우트의 월간 카운트 쿼리를 `queries.ts`에 마무리:
```typescript
import { and, eq, gte, sql } from "drizzle-orm";
export async function countAnalysesForUserSince(userId: string, sinceIso: string) {
  const uid = requireUserId(userId);
  const db = getDb();
  if (!db) return 0;
  const rows = await db.select({ n: sql<number>`count(*)::int` }).from(analyses)
    .where(and(eq(analyses.userId, uid), gte(analyses.createdAt, new Date(sinceIso))));
  return rows[0]?.n ?? 0;
}
```
analyze 라우트가 이 함수를 쓰도록 교체(기존 Supabase count 쿼리 대체).

- [ ] **Step 3: capabilities 플래그 교체**

Run: `grep -rn "supabaseConfigured" src/`
`supabaseConfigured`(SUPABASE_URL 존재 여부)를 `databaseConfigured = Boolean(process.env.DATABASE_URL)` + `authConfigured = Boolean(process.env.CLERK_SECRET_KEY)`로 교체하고 모든 참조 갱신.

- [ ] **Step 4: typecheck + build + user-story 스모크**

Run: `npm run typecheck && npm run build && npm run ci:user-story-matrix`
Expected: PASS. (스모크가 Supabase 의존하면 해당 부분 mock 갱신.)

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: dashboard + monthly limit + capabilities via clerk/neon"
```

---

## Phase 4 — Supabase 제거 & 정리

### Task 4.1: Supabase 파일/참조 삭제

**Files:** Delete supabase libs; Modify residual refs

- [ ] **Step 1: 잔존 참조 확인**

Run: `grep -rn "supabase\|@supabase\|createServerClient\|getSupabaseAdminClient\|getSupabaseUrl\|getSupabaseAnonKey" src/ middleware.ts scripts/`
모든 결과를 0으로 만드는 게 목표.

- [ ] **Step 2: 파일 삭제**

```bash
git rm -r src/lib/supabase
git rm src/lib/supabase_server.ts
git rm supabase/schema.sql
```
빈 `supabase/` 디렉터리 정리. `scripts/ci/supabase-keepalive.sh`와 package.json의 `supabase:keepalive` 스크립트 삭제.

- [ ] **Step 3: 잔존 참조 0 확인**

Run: `grep -rn "supabase\|@supabase" src/ middleware.ts package.json`
Expected: 0건.

- [ ] **Step 4: typecheck + build**

Run: `npm run typecheck && npm run build`
Expected: PASS.

### Task 4.2: .env.example 갱신

**Files:** Modify `.env.example`

- [ ] **Step 1: 교체**

`Database / Auth (Supabase)` 블록(line 44~54)을 다음으로 교체:
```
# -----------------------------
# Auth (Clerk) — Vercel Marketplace integration이 자동 주입
# -----------------------------
# REQUIRED
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
# REQUIRED
CLERK_SECRET_KEY=
# OPTIONAL: 컴포넌트 라우팅
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# -----------------------------
# Database (Neon) — Vercel Marketplace integration이 자동 주입
# -----------------------------
# REQUIRED for persistence
DATABASE_URL=
```
하단 STAGING/PROD 예시의 `SUPABASE_*` 라인도 Clerk/Neon으로 교체. 문의 이메일 안내가 필요하면 주석으로 `# CONTACT_EMAIL=kwan765@naver.com` 추가.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove supabase, document clerk + neon env"
```

---

## Phase 5 — 런타임 스모크 & 검증

### Task 5.1: 로컬 런타임 검증

- [ ] **Step 1: dev 서버 + 인증 흐름**

Run: `npm run dev` (env 3종 설정된 `.env.local` 필요)
- 비로그인으로 `/dashboard` 접근 → Clerk 로그인 페이지로 이동 확인
- 회원가입 → 로그인 → `/dashboard` 진입 확인

- [ ] **Step 2: 분석 저장/격리**

- 로그인 상태로 CSV 분석 1건 실행 → Neon `analyses`/`reviews`에 행 생성 확인(Neon SQL editor)
- 대시보드 히스토리에 노출 확인
- 다른 계정으로 로그인 → 첫 계정 분석이 안 보이는지(소유 격리) 확인

- [ ] **Step 3: report PDF**

- `/api/report/<id>` 접근 → 본인 소유 시 PDF, 타인/미인증 시 404/redirect 확인

- [ ] **Step 4: Paddle 웹훅(샌드박스)**

- 샌드박스 구독 이벤트 → `/api/billing/webhook` → `subscriptions` upsert → 플랜 티어 반영 확인

### Task 5.2: CI 게이트 + 배포

- [ ] **Step 1: 전체 게이트**

Run: `npm run lint && npm run typecheck && npm run build`
Expected: 모두 PASS.

- [ ] **Step 2: supabase import 0 최종 확인**

Run: `grep -rn "supabase" src/ middleware.ts package.json .env.example`
Expected: 0건 (env.example 주석 포함 0).

- [ ] **Step 3: 배포 + 스모크**

브랜치 푸시 → Vercel preview 빌드 green 확인 → 글로벌 규칙의 Vercel deploy loop + CDP 스모크 수행. PR 생성 시 `/review` 자동 실행.

---

## Self-Review 결과 (작성자 점검)

- **스펙 커버리지:** Clerk 인증(2.x)·Neon DB(1.x,3.x)·RLS→앱필터(1.4 헬퍼 강제)·Paddle 식별자 전환(3.1)·Resend(코드 미사용, 별도 작업 없음 — 스펙과 일치)·graceful degradation(0.1/2.1/2.2/index.ts) 모두 태스크 존재.
- **Placeholder:** `countAnalysesForUserSince`는 1.4에서 임시, 3.4 Step2에서 완성 SQL 제공 — 명시적 연결. 그 외 "추후 구현" 없음.
- **타입 일관성:** `getDb`/`listAnalysesForUser`/`getAnalysisForUser`/`insertAnalysisForUser`/`insertReviewsForAnalysis` 시그니처가 호출부(3.2/3.3/3.4)와 일치. camelCase↔snake_case 매핑 지점(report zod, dashboard 뷰) 명시.
- **알려진 정독 필요 파일:** analyze route, dashboard page, layout, capabilities, auth 페이지들 — 각 태스크에 `cat`/`grep` 선행 스텝 포함.
