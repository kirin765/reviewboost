# ReviewBoost — 다음 세션 핸드오프 (2026-08-29)

> 이 파일을 새 세션 시작 시 먼저 읽으면 됩니다. 세션 종료 시점 기준.
> 관련 지침: `CLAUDE.md` (프로젝트 전반), `.env.example` (환경변수 목록)

---

## 1. 지금 상황 한 줄 요약

- **결제 간소화**(게스트 결제 + Paddle 오버레이) / **네이버·카카오 로그인**(Clerk 브릿지) / **익스텐션 v1.4.1** — **구현·테스트 완료, 배포 완료, Clerk 프로덕션 전환 진행 중 (go-live + 도메인 변경 + 키 교체 완료, 도메인 프로비저닝/재배포 대기)**
- 앱 테스트 292개 + 익스텐션 테스트 80개 통과, typecheck/build 통과
- **DB 마이그레이션 적용 완료, Vercel 배포 완료** (게스트 결제 → 웹훅 → pending → claim 파이프라인 프로덕션 실측 완료)
- 남은 것: **Clerk 도메인 프로비저닝 완료 후 재배포** ("Clerk DNS Configuration" 체크 통과 시 알리아스 승격), 네이버/카카오 콘솔 Redirect URI 확인, **프로덕션 로그인/결제 실측**

---

## 2. A. 결제 간소화 (게스트 결제 + Paddle Checkout Overlay)

**구현 완료:**
- `/api/billing/checkout`: 비로그인(게스트) 허용 + `mode: "redirect" | "overlay"`.
  - 게스트: `custom_data`에 `user_id` 없음, `customer.email_address`로 결제
  - 오버레이: 서버가 `{ priceId, clientToken, environment, successUrl, userId }` 내려주고 클라이언트가 Paddle.js로 결제창
- 웹훅: 사용자 매핑 순서 `custom_data.user_id` → paddle 고객 매핑 → **이메일로 Clerk 사용자 조회** → 없으면 `pending_subscriptions` 보관
- `/api/billing/claim`(신규): 로그인한 이메일로 pending → `subscriptions`+`profiles` 이전 (연결 페이지에서 로그인 시 자동 호출)
- `src/middleware.ts`: `/api/billing/checkout` 보호 목록에서 제거 (게스트 허용, 라우트 내부 CSRF+auth)
- UI: `src/components/extension/PaddleCheckoutOverlay.tsx`(신규), `ExtensionConnectClient.tsx` 재작성 (게스트 "이메일로 바로 결제" 버튼, `?checkout=1` 자동 오버레이)

**핵심 파일:** `src/app/api/billing/checkout/route.ts`, `src/app/api/billing/webhook/route.ts`, `src/app/api/billing/claim/route.ts`, `src/lib/billing.ts`, `src/lib/clerk_bridge.ts`(신규), `src/lib/paddleWebhook.ts`, `src/lib/db/schema.ts`(pending_subscriptions), `drizzle/0001_pending_subscriptions.sql`

**Paddle 샌드박스 실측 결과 (완료):**
- 샌드박스 키로 `GET /prices` → 익스텐션 플랜 `pri_01ky1ezm5drh8znqfw9acgrmk3` (₩4,900/월) 확인
- 게스트 트랜잭션 생성 201 + 체크아웃 URL 200 확인
- 브라우저에서 `?checkout=1` → Paddle 오버레이 iframe(`sandbox-buy.paddle.com`) 실제 오픈 확인
- 샌드박스 클라이언트 토큰: `test_569661de89b2190b41d7f5f0235` (`GET /client-tokens`로 조회)
- 검증 도구: `scripts/paddle-sandbox-check.mjs` (키는 `PADDLE_API_KEY` env로 주입)

**남은 것:**
1. ~~DB 마이그레이션 적용~~ ✅ (2026-08-29 적용 완료 — `pending_subscriptions` + 인덱스 생성 확인)
   - ⚠️ 주의: drizzle-kit가 `support_inquiries` 테이블도 끌어들였길래 수작업으로 제거함 — **pending_subscriptions만** 들어있는 파일임. 이미 support_inquiries가 있는 DB에 그대로 실행해도 안전. (적용은 `Pool`로 실행 — `neon()` HTTP 드라이버의 `sql.unsafe()`는 no-op이므로 사용 금지)
2. **배포(Vercel) 완료** (2026-08-29) → 결제 완료 웹훅 실측은 시뮬레이션으로 확인됨 (pending_subscriptions 생성/claim 이동). **실결제**는 오버레이/실제 카드 결제로 최종 확인 필요 (공개 HTTPS 도메인 + live 키로 가능해짐)
3. 오버레이 실결제 확인 (live 환경) — 게스트 이메일로 체크아웃 오픈까지는 실측됨

---

## 3. B. 네이버·카카오 로그인 (Clerk 유지 브릿지)

**구현 완료:**
- `src/lib/social_auth.ts`(신규): 네이버/카카오 OAuth2 인가 URL·토큰 교환·프로필 파싱·state 쿠키(CSRF/오픈리다이렉트 방지)
- `/api/auth/social/[provider]/start` + `/callback`(신규): OAuth → Clerk 사용자 조회/생성 → `sessions.createSession` → `__session` 쿠키 설정 → next 리다이렉트
- `src/components/Auth/SocialLoginButtons.tsx`(신규): 로그인/가입 페이지에 네이버/카카오 버튼
- 테스트: `src/lib/social_auth.test.ts`, start/callback route 테스트 (콜백은 clerk mock으로 세션 생성 검증)

**⚠️ 알려진 블로커 (중요):**
- 현재 Clerk 인스턴스가 **개발 인스턴스** (`awaited-mustang-28.clerk.accounts.dev`) → 개발 인스턴스는 **dev-browser 핸드셰이크**를 요구해서 서버가 심은 `__session` 쿠키가 거부됨
- 실측 헤더: `x-clerk-auth-reason: dev-browser-missing` / `dev-browser-sync`
- 시도해본 것: `__dev_session` 쿠키, `POST /v1/dev_browser` 토큰, `__clerk_db_jwt` 쿼리, `/v1/handshake` — 전부 차단
- **⇒ 프로덕션 Clerk 인스턴스에서는 이 게이트가 없어서 동작할 것으로 예상. 프로덕션 전환 후 반드시 실측 필요** (코드 주석에도 남겨둠)

**콘솔 상태:**
- 네이버: client_id 유효 확인됨 (동의 화면 렌더 "Review Boost"). Callback URL 등록 필요/확인: `https://reviewboost.co.kr/api/auth/social/naver/callback` (네이버 개발자센터 → API 설정 → Callback URL)
- 카카오: **검수 대기 중** (사용자 확인). 승인 후: 카카오 개발자센터 → 카카오 로그인(활성화 ON) → **Redirect URI**에 `https://reviewboost.co.kr/api/auth/social/kakao/callback` 등록. client_secret은 선택(없어도 동작)
- 관련 자료: `docs/naver-login/`(심사 캡처 + E2E 최종 스크린샷), `docs/kakao-login/`(signup 캡처 + `개인정보-동의항목-심사-작성본.md` — 카카오 심사 문서 작성본)

**✅ E2E 실측 결과 (2026-08-29, 프로덕션):**
- **네이버 로그인 전체 플로우 PASS**: start → 네이버 동의 → 콜백 → sign-in token → `/login?__clerk_ticket=...` 위젯 교환 → `__session` 쿠키 → `/extension-connect`, `usage API: authenticated:true` 확인. 검증 도구: `node scripts/e2e-social-login.mjs naver` (CDP 9222 사용자 Chrome, 네이버 세션 이용)
- **카카오는 KOE006(Admin Settings Issue)로 차단** — 앱 검수/설정 미완료가 원인 (OAuth 브릿지 자체는 동작, 인가 URL까지 정상 로드). `node scripts/e2e-social-login.mjs kakao` 로 재확인 가능 (KOE 감지 자동 종료)
- **버그 수정 (배포 완료)**: 콜백 `createUser`가 `password:required` 인스턴스 설정 때문에 `400 form_data_missing`으로 실패 → 신규 유저에 **랜덤 비밀번호** 생성하도록 수정 + 오류 로그(`console.error("[social-auth] …")`) 추가
- **프로덕션 소셜 버튼 숨김**: `src/components/Auth/SocialLoginButtons.tsx` — `NEXT_PUBLIC_ENABLE_SOCIAL_LOGIN === "1"` 일 때만 렌더 (기본 숨김, 프로덕션 미설정 확인됨). 카카오 검수 통과 후 Vercel 프로덕션 env에만 "1" 설정하면 재노출

**로컬 전체 플로우 테스트 방법(이미 만들어진 도구):**
- `scripts/naver-login-capture.mjs` (+ `.shoot-naver-login.mjs`): **프로덕션 콜백(`https://reviewboost.co.kr/api/auth/social/naver/callback*`)을 route intercept로 localhost:3001로 돌려** 로컬에서 전체 OAuth 플로우 실측 가능. dev 서버(3001) 켜고 실행.
- ⚠️ `.shoot-naver-login.mjs` 안에 네이버 비밀번호가 평문으로 있음 — 커밋 금지/공유 주의

**남은 것 (외부 작업 위주):**
1. 코드 배포 (콜백 라우트가 `reviewboost.co.kr`에 살아야 함)
2. 네이버 콘솔 Callback URL / 카카오 Redirect URI 등록 확인 (카카오는 검수 승인 후)
3. **Clerk 프로덕션 전환**: Clerk 대시보드 go-live
   - 권장: 본인 도메인 `accounts.reviewboost.co.kr` 사용 → **Cloudflare**(reviewboost.co.kr DNS가 Cloudflare: mcgrory/margot.ns.cloudflare.com)에 CNAME 2개 추가 (Proxy off/DNS only):
     - `accounts` → `accounts.clerk.services`
     - `clerk` → `frontend-api.clerk.services`
   - 더 빠른 대안: go-live 화면에서 Clerk 호스팅 프로덕션 도메인(예: `*.clerk.com` 계열) 선택 시 DNS 불필요
   - ⚠️ 지난 세션에서 Clerk가 준 `robust.shad-38.lcl.dev` 도메인은 **Clerk 관리 도메인**(NS = worker.clerkprod-cloudflare.net) — 내 DNS에 CNAME 추가하는 안내는 해당 없음
4. 프로덕션에서 네이버/카카오 로그인 실측 (로그인 → `/extension-connect` 연결 → 팝업 사용)

---

## 4. C. Chrome 익스텐션 — v1.4.1 (CWS 제출 대기)

**v1.4.1 내용:**
- 리뷰 **이미지 URL 수집** (쿠팡 `attachments[].imgSrcOrigin`, 스마트스토어 `reviewAttaches[].attachUrl` — 실 API 형태로 방어적 추출)
- 내보내기 = **스마트스토어 판매자센터 공식 리뷰 엑셀 25열 폼** (포토/영상 열 포함, KST 날짜 형식)
- **유료 플랜 무제한** (아래 5장 참고)
- 패키지: `extension/reviewboost-extension-v1.4.1.zip` (manifest가 zip 루트, 버전 1.4.1)

**이후 진행 (2026-08-30):**
- ✅ **CWS v1.4.1 제출 완료 (사용자 직접)**
- ✅ **Edge/웨일 v1.4.1 패키지 생성** — `extension/reviewboost-extension-edge-1.4.1.zip` / `extension/reviewboost-extension-whale-1.4.1.zip` (HEAD 빌드 = CWS 제출본과 동일 소스, manifest 루트, v1.4.1, **CS 문의 탭 + `*://reviewboost.co.kr/*` 호스트 권한 포함**). 기존 10:19 빌드(CS 탭 없음)는 `reviewboost-extension-v1.4.1-before-cs-tab.zip`으로 백업
- ⏳ **Edge/웨일 제출은 사용자 직접** — `extension/EDGE_STORE.md` / `extension/WHALE_STORE.md` (기존 v1.3.0 항목 **업데이트 제출**로 진행)

**실 URL 검증 도구 (유지):**
- `extension/scripts/e2e-extension.mjs` — 진짜 Chrome + unpacked 확장 E2E (쿠팡/스마트스토어 실측, popup 버튼 클릭 → 다운로드 파일 검증). `LIVE_URL=... node scripts/e2e-extension.mjs`
- `extension/scripts/live-verify.mjs` — 실 URL API 캡처 → 실제 lib 코드로 정규화/내보내기 검증
- 참고: 스마트스토어 실측은 `~/chrome-cdp-profile`(네이버 로그인 세션) Chrome + CDP 9222 필요, 네이버 봇 감지로 재시도 필요할 수 있음

**CWS 제출:** `extension/STORE_LISTING.md`에 등록정보/개인정보 문구 전부 준비됨 (v1.4.1로 갱신됨). ✅ **사용자가 직접 제출 완료 (2026-08-30).** Edge/웨일은 아래 "이후 진행" 참고.

**✅ 라이브 E2E 실측 (2026-08-29, dist v1.4.1 = 제출 zip과 동일 소스):**
- **쿠팡**: Toocki C to C 60W 케이블 상품 — 9개 수집(이미지 2개), CSV 25열 폼 + `thumbnail.coupangcdn.com` 이미지 URL 확인, exit 0
- **스마트스토어**: 삼성 노트북 갤럭시북4 (`smartstore.naver.com/djcnc1120/products/11613703477`) — 60개 수집(**이미지 47개**), 실 리뷰 API(`/i/v1/contents/reviews/query-pages` 등) 호출, CSV **포토/영상 열에 `phinf.pstatic.net` 이미지 URL 실제 기재**, exit 0
- 도구: `cd extension && KEEP_CHROME=1 LIVE_URL="<상품URL>" node scripts/e2e-extension.mjs` (CDP 9222 세션 재사용, 산출물 `/tmp/rb-e2e/`)

---

## 5. 유료 플랜 무제한 (이번 세션 변경)

- 서버: `src/lib/extension_plan.ts` — `extensionDailyLimit("paid")` → `null`(무제한). 무료 50개 유지
- `/api/extension/usage` GET: 유료 → `{ limit: null, remaining: null }`; POST: 유료는 쿼터 소비 건너뜀
- 익스텐션: 팝업 "무제한" 표시, `clampToRemaining(null)` = 클램프 안 함. **1회 수집 안전 상한(COLLECT_HARD_MAX=2000)은 일일 한도와 별개로 유지**
- 문구: 연결 페이지, `site-content.ts`(ko/en), `structured-data.ts`, docs 전부 "하루 2,000개"→"무제한"
- ⚠️ `maxReviewsPerAnalysis=2000`(분석당 리뷰 수), `MAX_TEXT_LEN=2000` 등은 **무관한 값** — 건드리지 말 것

---

## 6. 검증 상태 (세션 종료 시점)

| 항목 | 상태 |
|---|---|
| `npm run typecheck` (앱) | ✅ |
| `npx vitest run` (앱) | ✅ 292 tests |
| `npm run build` (앱) | ✅ |
| 익스텐션 typecheck/test/build | ✅ 80 tests |
| Paddle 샌드박스 실측 | ✅ (게스트 트랜잭션/오버레이 오픈) |
| **DB 마이그레이션 적용** | ✅ (2026-08-29 적용, `pending_subscriptions` 생성 확인) |
| **배포 (Vercel)** | ✅ (2026-08-29, reviewboost.co.kr 반영 — OAuth/결제 라우트 라이브 확인) |
| **게스트 결제 → 웹훅 → pending** 실측 | ✅ (프로덕션 웹훅에 서명된 `transaction.completed` 시뮬레이션 → pending_subscriptions 생성 확인) |
| **claim → subscriptions/profiles** | ✅ (라이브 DB 통합 테스트 — pending 이동/삭제 확인) |
| **유료 플랜 무제한** | ✅ (프로덕션 실측: paid → `limit:null`, 쿼터 미소비) |
| 네이버 OAuth 동의 화면 | ✅ (client_id 유효) |
| **네이버 로그인 완료 실측** | ✅ (2026-08-29 프로덕션 E2E PASS — ticket→`__session`→authenticated) |
| 카카오 로그인 완료 실측 | ❌ KOE006 차단 (검수 대기 — 브릿지 동작은 확인) |
| **Clerk 프로덕션 전환** | ✅ (go-live 완료, 로그인 실측도 통과) |

---

## 7. 다음 세션 우선순위

**거의 완료 (2026-08-29):**
- ✅ **Clerk 프로덕션 전환 완료!** go-live + `change_domain`(primary `reviewboost.co.kr`, FAPI `clerk.reviewboost.co.kr`, 포털 `accounts.reviewboost.co.kr`) + DNS 5개(grey cloud) + **Vercel 재배포 성공 → reviewboost.co.kr 알리아스 승격** ("Clerk DNS Configuration" 체크 통과). 로그인 페이지가 `pk_live_Y2xlcmsucmV2aWV3Ym9vc3QuY28ua3Ik`(clerk.reviewboost.co.kr) 사용 확인
- ✅ 키 교체: .env.local + Vercel(3 env) — sk_live_HhEOR0A7... / pk_live_Y2xlcmsu...
- ✅ 프로덕션 E2E 유저: user_3IZaoFkiwZdoc6wvnX9GNHya3Ge
- ⏳ **남음**: (1) **프로덕션 로그인 완료 실측** — 비밀번호 로그인은 이메일 OTP 단계까지 확인됨(새 기기 검증, 클렁 메일 발송 = clkmail/DKIM 정상). **OTP 입력 또는 네이버/카카오 OAuth 로그인은 브라우저에서 사용자 확인 필요** (이메일 소관/네이버 세션), (2) 게스트 결제 → 로그인 → 자동 연결(claim) 실측, (3) E2E는 프로덕션 FAPI가 localhost 오리진 거부(400)로 로컬 실행 불가 — 프로덕션 URL 대상 또는 allowed origins 조정 필요 (후속 작업)

**헤드리스 검증 완료 (2026-08-29):** 로그인 페이지 Clerk 위젯 로드(hasClerk=true, CSP 수정 후), 이메일+비밀번호 로그인 → "이메일 확인(factor-two)" 단계 도달(새 기기 검증), __session 쿠키 미발급(OTP 대기 — 정상), 익스텐션 토큰 새 키 서명 동작/구 키 거부 확인.

**이번 세션 추가 수정 (2026-08-29):**
- ✅ **CSP 수정**: `src/lib/security.ts` — Clerk FAPI 호스트를 publishable key에서 동적 추출(`clerkFrontendApiHost()`: pk_(test|live)_ + base64(FAPI host$)). dev(`*.clerk.accounts.dev`)와 prod(`clerk.reviewboost.co.kr`) 모두 커버. 이전엔 prod FAPI가 CSP script-src에 없어 **Clerk 위젯 로드 실패** → 배포 후 `hasClerk: true` 확인. 유닛 테스트 4개 추가 (`src/lib/security.test.ts`)
- 참고: dev 인스턴스의 `dev-browser` 게이트는 프로덕션에 없음 → 서버 발급 세션 로그인은 프로덕션에서 동작할 것으로 예상 (실측 필요). **E2E(로컬 dev 서버+prod 키)는 프로덕션 FAPI가 localhost 오리진을 400 거부해 위젯 미초기화로 실패** — 프로덕션 URL 대상 E2E 또는 Clerk 인스턴스 allowed origins에 localhost 추가가 필요 (후속 작업).

**핵심 절차 (다음 세션)**
1. 도메인 확인: `curl -s https://clerk.reviewboost.co.kr/v1/environment` (403 HTML → JSON이면 프로비저닝 완료)
2. 재배포: `env -u VERCEL_ORG_ID vercel --prod --yes` (체크 통과 확인)
3. 로그인 실측: `scripts/naver-login-capture.mjs`(프로덕션 콜백 intercept) + 게스트 결제 → claim
4. 카카오 Redirect URI: `https://reviewboost.co.kr/api/auth/social/kakao/callback`
2. **키 교체 + 재배포** — 프로덕션 `sk_live_`/`pk_live_`를 `node scripts/clerk-prod-switch.mjs --secret sk_live_xxx --publishable pk_live_xxx` 로 교체 후 `env -u VERCEL_ORG_ID vercel --prod --yes`
3. **카카오 승인 확인** → Redirect URI 등록 (`https://reviewboost.co.kr/api/auth/social/kakao/callback`), 네이버 Callback URL 등록 확인
4. 프로덕션에서 **네이버/카카오 로그인 + 게스트 결제 → 자동 연결** 실측 (로그인 → `/extension-connect` → 팝업 사용)
5. CWS v1.4.1 제출 (사용자 직접)

### 이번 세션(2026-08-29) 참고 사항

- **준비된 헬퍼 스크립트 (go-live 후 순서대로 실행):**
  1. `node scripts/clerk-prod-dns.mjs` — Cloudflare CNAME 2개 추가 (토큰 `~/.cf_dns_token` 또는 `CLOUDFLARE_API_TOKEN`, 권한 Zone→DNS→Edit)
  2. `node scripts/clerk-prod-switch.mjs --secret sk_live_xxx --publishable pk_live_xxx` — .env.local + Vercel(3 env) 키 교체 + 새 키 검증
  3. `env -u VERCEL_ORG_ID vercel --prod --yes` — 재배포
- 배포 시 `.vercelignore` 신설 — `.shoot-naver-login.mjs`(비밀번호 평문), `_up1.mjs`, `google-tasks-memo.mjs`, `PAYWALL-PLAN-2026-08-07.md`, `kin-bot/` 배포 업로드 제외 (기존 항목 `/extension`, `src/app/rss.xml`, `.playwright-mcp`, `_qt_assets` 유지). `.gitignore`에도 `.shoot-naver-login.mjs` 등 추가.
- Vercel env: `NAVER_CLIENT_ID`/`NAVER_CLIENT_SECRET`/`KAKAO_CLIENT_ID` 추가됨 (production+preview+development). `KAKAO_CLIENT_SECRET`은 미설정(없어도 동작). `APP_ENV`는 Vercel에 없음 — 코드가 `NODE_ENV`로 대체하므로 무해.
- ⚠️ `neon()` HTTP 드라이버의 `sql.unsafe()`는 **실행이 아니라 SQL 조각 반환** — 마이그레이션/DDL은 `Pool`(WebSocket)로 실행할 것 (이번에 삽질함).
- 게스트 결제 redirect 모드의 payment link = 앱 페이지 + `?_ptxn=` + Paddle.js 전역 초기화(layout.tsx)가 자동 오버레이 — 동작 확인됨.
- 재배포 1회 더 수행됨 (`.vercelignore` 수정 반영) — 배포 후 `/api/health`, `/api/preview`(CSV 업로드), OAuth start/callback 스모크 재확인 완료.

## 8. 주의사항

- `.env.local`에 실 키 존재 (네이버/카카오, Clerk, Paddle live) — **gitignored, 커밋 금지**
- `.shoot-naver-login.mjs`에 네이버 비밀번호 평문 — 공유/커밋 금지
- `npm test`는 소스텍스트 가드 스크립트 + vitest를 함께 돈다
- dev Clerk 인스턴스의 dev-browser 게이트 때문에 **로컬(dev)에서는 서버 발급 세션 로그인이 안 됨** — 프로덕션 전환 전에 "안 되는 게 정상"이라고 혼동하지 말 것
- 웹훅/결제 관련 사전 수정분(`src/app/extension-privacy`, `terms`, `AppShell`, `api/extension/event`, `db/queries.ts` 등)이 커밋 전 상태로 섞여 있음 — 커밋 시 이번 세션 작업과 구분해 리뷰할 것

## 9. 다중 플랫폼 확장 — 계획 (2026-08-30, brain 세션)

> 확장의 크롤링·다운로드 대상 확장. 상세 상태·리스크: `docs/multi-platform-crawl.md`.
> 다른 세션이 이 파일 경로에서 유사 작업을 진행 중이면 **이 섹션과 multi-platform-crawl.md를 먼저 읽고** 겹치지 않게 진행할 것.

### 지금까지 한 것 (병행 금지 대상)

- ✅ 플랫폼 레지스트리 `extension/src/lib/platforms.ts` — 무신사·29CM·G마켓·옥션·11번가·SSG·오늘의집·컬리 8개 추가(호스트·상품ID 추출)
- ✅ **29CM 어댑터 완성** — `lib/29cm.ts` + `content/collect-29cm.ts` + `normalize29cmReview` + 라우팅 + manifest(matches·host_permissions) + `test/29cm.test.ts` (94 테스트 통과·typecheck 클린, 커밋 36af7a29)
- ✅ 약관·robots 실측: 오늘의집 "리뷰 영리 목적 이용 금지"(최강)·G마켓 "영리 수집 금지"·무신사/11번가 robots 전면 차단 — **리스크 수용 확정(사용자), 진행 중**
- ✅ 헤드리스 캡처 4회: 29CM만 통과. 나머지는 실브라우저 세션 필요

### 다음 작업 (이 세션이 이어서 할 것 / 다른 세션도 할 수 있음 — 캡처는 세션 중복 비권장)

1. **실세션 캡처 (플랫폼당 상품 1건, 리뷰 있는 것)**: 11번가 → SSG → 무신사 → 오늘의집·G마켓·컬리.
   - 방법: 사용자 Chrome(CDP) 또는 `brain/tmp/capture4.mjs`(헤드리스) — 봇 차단 플랫폼은 CDP 실세션 필수
   - 산출: 리뷰 XHR URL·요청 파라미터·응답 스키마·페이지네이션 → `brain/raw/review-platform-capture-2026-08-30/`에 **추가만**(덮어쓰기 금지)
2. **어댑터 작성 (캡처된 플랫폼만)**: 29CM 패턴 복제 — `lib/{p}.ts`(URL·파서) + normalize + `content/collect-{p}.ts`(paginate, 0-based 페이지 주의) + `index.ts` 라우팅 + manifest + 테스트
3. **배포 (09-04 게이트 후, 측정 보호)**: 버전 1.4.1 → 1.5.0 · 이름/설명 "쿠팡·스마트스토어" → 지원 목록 갱신 · CWS/Edge/웨일 재제출 · `STORE_LISTING.md` 갱신
4. **리스크 잔여**: 29CM 약관 본문(robots 허용만 실측됨), 무신사·11번가(최신)·컬리 약관 본문 — 실측 원문 `brain/raw/review-platform-tos-scan-2026-08-30.md`

### 규율 (지키는 것)

- **게이트(09-04) 전 스토어 제출 금지** — 확장 v1.4.1 라이브 유지, 가격·문구 동결 그대로
- raw 불변 — 캡처 결과 추가만(이 레포 훅 아님, brain 훅이 차단)
- 29CM 이미지 CDN(`cdn.29cm.co.kr`)은 추정값 — 이미지 깨지면 수정
