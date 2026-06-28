# ReviewBoost 마케팅 리뉴얼 — 설계 문서 (2026-06-28)

> 근거 전략: `~/projects/misc/brain/reports/marketing-strategy-3projects-2026-06-28.md`
> reviewboost는 유료 0원, 100% 오가닉. 핵심 레버리지 = **무료 리포트 hook + sajangbu 채널 공유/크로스셀**.

## 0. 목표 한 줄

쿠팡 상품 URL만 붙여넣으면 **무료로 리뷰 분석 리포트**를 즉시 보여주는 hook을 만들고(PDF 저장 시 이메일/가입으로 리드 확보), 제품 화면 전체를 **밝은 고가시성 테마**로 통일하며, 공유하고 싶은 **상품성 있는 리포트 + OG 카드**로 오가닉 바이럴을 노리고, **sajangbu와 양방향 크로스 ads**로 같은 ICP를 순환시킨다.

## 확정된 결정 (사용자 승인)

1. **Hook 입력**: 상품 URL 붙여넣기 (쿠팡 우선). 스마트스토어는 후속 단계.
2. **리드 게이트**: 리포트는 전부 무료, **PDF 다운로드/저장 시점에만** 이메일·가입 게이트.
3. **상품성 정의**: 공유/자랑용 비주얼 — 브랜딩 + OG 이미지 + 캡처 친화 레이아웃.
4. **디자인 컨셉**: 기존 밝은 마케팅 테마(`--color-*`: 흰 패널 + 퍼플 `#5b5cea` + 시맨틱 상태색)를 **제품 화면 전체로 통일**.
5. **크로스 ads 범위**: 양쪽 다 — reviewboost(`/Users/kiwankim/projects/saas/reviewboost`)와 sajangbu(`/Users/kiwankim/projects/sajangbu/jeungsan`, Next.js+Tailwind).

## 기술 현황 (조사 결과)

- **스택**: Next.js 14 App Router, React 18, TS strict, Tailwind v4(CSS-first `@theme`, config 파일 없음), Clerk 인증 + Neon(Drizzle). 브랜치 `migrate/clerk-neon`.
- **다크의 정체**: 마케팅 페이지는 이미 밝음(`--color-*`). 제품 화면(`AnalysisResults`, 대시보드, 업로드, 인증)은 다크 토큰 `--rb-*`(globals.css `:root` ~L1110) + 하드코딩 다크 rgba(약 11개 파일)로 여전히 어둠. 토큰 사용량 `--rb-*` 371회 / `--color-*` 330회.
- **크롤러**: 외부 crawler-server(Express, Playwright, 포트 3010)가 쿠팡만 지원(허용 도메인 `www/m/coupang.com`, 상품당 최대 ~300리뷰, 클라 타임아웃 180s, Vercel maxDuration 300s, Akamai 차단 ~10–20%). 현재는 `/coupang-csv`에서 **CSV 다운로드**로만 연결됨. `COUPANG_CRAWLER_BASE_URL` 환경변수에 의존(프로덕션 가용성 확인 필요).
- **분석 파이프라인**: `/api/analyze`가 게스트(userId=null) 시 free tier(휴리스틱)로 동작 가능. DB 저장만 userId 필요. 리포트 산출물(`AnalysisOutput`)은 이미 풍부(긴급리뷰/우선순위 매트릭스/액션아이템/별점 시뮬/긍정·부정 키워드/제안).
- **PDF**: Puppeteer(HTML→PDF) 주경로 + PDFKit 폴백. 글자 겹침 유력 원인 = PDFKit 절대 y좌표 + 멀티라인 사전측정 누락 + lineGap 불일치(`report_pdfkit.ts`), 그리고 Puppeteer base64 폰트 로드 레이스(`report_html.ts`/`report_renderer.ts`).

---

## 구현 단계 (의존순)

각 단계는 독립적으로 구현·검증 가능. 권장 순서: **0 → 1 → 2 → 3 → 4** (0·1은 서로 독립, 3은 1 이후).

### Phase 0 — PDF 글자 겹침 수정 (버그)

- **재현 먼저**: 로컬에서 샘플 분석 → `/api/report` 호출 → 어느 경로(Puppeteer/PDFKit)가 도는지, 어디서 겹치는지 확정. (systematic-debugging 적용 — 추측 금지, 재현 후 수정.)
- **PDFKit 수정 후보** (`src/lib/report_pdfkit.ts`):
  - 절대 y-offset로 배치하는 멀티라인 텍스트는 모두 `measureHeight()`로 사전측정 후 배치 (특히 metrics-summary `recentHint` ~L528, KPI grid label/value ~L276–292, 연속 표시 ~L418).
  - 측정 시 `lineGap`과 렌더 시 `lineGap`을 항상 일치.
  - 폰트 누락 시 silent fallback 감지/로깅.
- **Puppeteer 수정 후보** (`report_html.ts`/`report_renderer.ts`): `page.pdf()` 전에 `document.fonts.ready` 대기로 base64 폰트 로드 보장.
- **검증**: 한국어 멀티라인·다페이지 리포트 PDF 재생성 → 겹침 없음 육안 확인(스크린샷). 두 경로 모두 점검.
- **범위 밖**: PDF 레이아웃 전면 재디자인(이건 Phase 3에서 브랜딩과 함께).

### Phase 1 — 밝은 테마 전체 통일 (디자인 기반)

- **접근(저-churn)**: ① globals.css의 다크 `--rb-*` 토큰 값을 밝은 팔레트로 재정의(소비처 371곳을 일괄 전환) + ② 토큰으로 못 바꾸는 **하드코딩 다크 rgba**를 밝은 값/토큰으로 교체.
  - `--rb-*` → 밝은 매핑 예: `--rb-bg`=`#f5f7ff`, `--rb-surface`=`#ffffff`, `--rb-fg`=`#1f2559`, `--rb-muted`=`#7c83ab`, `--rb-accent`=`#5b5cea`, `--rb-danger`=`#ff7a66`, `--rb-warning`=`#ffbf47`. (정확한 값은 `--color-*`와 일치시켜 단일 소스화.)
  - 하드코딩 교체 대상(grep 확정): `AnalysisResults/index.tsx`(tone map L32–58의 다크 패널/배지/바), `AppShell.tsx`, `app-shell.css`, `FeedbackModal.tsx`, `PageLoading.tsx`, `CsvPreview.tsx`, `dashboard/page.tsx`, `features/page.tsx`, `help/page.tsx`, `HomePageContent.tsx`(잔존 다크).
- **대비**: 본문/상태색은 WCAG AA(텍스트 대비 ≥4.5:1) 충족. 컬러 배경 위 텍스트는 동일 색계열 진한 톤 사용.
- **검증**: preview로 각 라우트(홈/대시보드/analyze/리포트/인증/help/pricing/blog) 로드 → 스크린샷, 다크 패널 잔존 0, 대비 확인.
- **범위 밖**: 레이아웃·정보구조 변경(색/표면만). 새 컴포넌트 추가 없음.

### Phase 2 — 무료 URL 리포트 퍼널 + PDF 저장 게이트 (Hook)

- **퍼널(라우트 확정)**: 랜딩 히어로에 쿠팡 URL 입력란 추가 → 제출 시 공개 라우트 `/free-report`로 이동(URL 쿼리 전달) → `/free-report`가 신규 `POST /api/free-report`(크롤러 호출 + 분석 파이프라인, 휴리스틱, **DB 미저장**) 결과로 전체 `AnalysisResults` 인라인 표시 → "PDF로 저장/다운로드" 클릭 시 **이메일 입력 또는 Clerk 가입** 모달 → PDF 제공. (별도 랜딩과 결과를 한 `/free-report` 라우트로 통일 — 신규 페이지 1개 + API 1개.)
- **미들웨어**: `/dashboard`·`/api/analyze`는 보호 유지. 신규 `/free-report`·`/api/free-report`는 공개. (홈 FAQ의 "무료로 바로 시작" 문구와 일치하게 됨.)
- **리드 저장**: Drizzle에 `leads` 테이블 신설(`email`, `source`, `product_url`, `created_at`). PDF 게이트 통과 시 insert. (가입 시엔 Clerk user로 승격.)
- **남용 방지**: 크롤러는 비쌈 → `/api/free-report` per-IP 일일 횟수 제한.
- **에러 UX**: Akamai 차단/리뷰 없음/잘못된 URL은 명확한 한국어 안내 + CSV 업로드 대안 링크(`/dashboard/analyze`) 제시.
- **검증**: preview에서 실제 쿠팡 URL 붙여넣기 → 리포트 표시 → PDF 클릭 시 게이트 → 이메일 저장 확인(network/logs). `COUPANG_CRAWLER_BASE_URL` 미설정 시 graceful 안내.
- **범위 밖**: 스마트스토어 크롤러(후속), 결제/플랜 변경.

### Phase 3 — 리포트 상품성: 공유/브랜딩/OG (1 이후)

- **리포트 브랜딩**: 상단 워드마크 + 하단 "Powered by ReviewBoost · reviewboost.app", 캡처해도 깔끔한 여백/정렬. (웹 리포트 + PDF 양쪽.)
- **OG 이미지**: 동적 `opengraph-image.tsx`로 랜딩/무료리포트 공유 시 미리보기 카드가 멋지게 언펄(오가닉 바이럴). sajangbu의 `opengraph-image.tsx`를 참고 모델로.
- **공유 카드(선택)**: 요약(부정비율·TOP키워드·우선순위)을 1장 PNG로 "이미지로 저장" — 카페/블로그 공유용. v1은 OG + 브랜드 리포트까지, PNG 공유는 여력 시.
- **검증**: OG 렌더 확인(메타 unfurl), 브랜드 리포트 스크린샷이 공유 가능 수준인지 육안 확인.
- **범위 밖**: 워터마크 제거 유료화 같은 과금 로직.

### Phase 4 — sajangbu ↔ reviewboost 크로스 ads (양 레포)

- **공통**: 양쪽에 dismissible 크로스-프로모 컴포넌트(톤 일치, UTM 태깅 `utm_source=reviewboost`/`sajangbu`, `utm_medium=cross`).
- **reviewboost 측**: sajangbu(쿠팡 정산 SaaS) 프로모 — 대시보드 배너 + 리포트/PDF 푸터 + 분석 완료 후 "정산도 자동화하세요" CTA.
- **sajangbu 측**(`/Users/kiwankim/projects/sajangbu/jeungsan`): reviewboost(리뷰 분석) 역프로모 — 동일 배치.
- **검증**: 양 앱 빌드 통과, 배너 렌더, 링크 UTM 확인. (sajangbu는 별 레포라 별도 커밋/PR.)
- **범위 밖**: 광고비 집행, 공유 추적 대시보드.

---

## 단계별 성공 기준 요약

| Phase | 완료 정의 |
|---|---|
| 0 PDF | 한/멀티라인·다페이지 PDF 겹침 0, 두 경로 검증, 스크린샷 |
| 1 디자인 | 전 라우트 밝게, 다크 패널 잔존 0, 텍스트 대비 AA |
| 2 Hook | 쿠팡 URL→무료 리포트→PDF 게이트→lead 저장, 남용 제한, 에러 안내 |
| 3 상품성 | 브랜드 리포트(웹+PDF) + 동적 OG 언펄 |
| 4 크로스ads | 양 앱 빌드+렌더, UTM 링크 양방향 |

## 리스크 / 미해결

- **크롤러 프로덕션 가용성**: `COUPANG_CRAWLER_BASE_URL`이 가리키는 crawler-server가 살아있어야 hook 동작. 배포 위치/안정성 확인 필요(미가용 시 CSV 업로드 폴백 안내로 degrade).
- **Akamai 차단율 ~10–20%**: 무료 hook 첫인상에 영향 → 재시도/대안(CSV) UX 필수.
- **테스트 부재**: 저장소에 테스트 스위트 없음 → 검증은 빌드/lint + preview 스모크로 수행.
