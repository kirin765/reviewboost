# ReviewBoost SEO / AI Discoverability MVP

## 목적

- 한국 이커머스 셀러 검색 수요에서 `리뷰 분석`, `부정리뷰 대응`, `리뷰 CSV 추출`, `FAQ 생성` 키워드를 선점한다.
- 검색 유입뿐 아니라 ChatGPT, Claude, Perplexity 같은 AI 도우미 유입을 GA4에서 구분 추적한다.
- 퍼블릭 랜딩과 실제 앱 워크스페이스를 분리해, 인덱싱은 마케팅 페이지 중심으로 관리한다.

## URL 구조

- `/`
- `/extension` — 리뷰 수집 확장 프로그램의 설치·지원 쇼핑몰·수집 한도·FAQ
- `/features`
- `/features/ai-review-analysis`
- `/features/review-csv-export`
- `/features/negative-review-response`
- `/features/review-faq-generator`
- `/pricing`
- `/help`
- `/help/csv-checklist`
- `/help/coupang-review-csv-export`
- `/help/smartstore-review-csv-export`
- `/help/faq`
- `/blog`
- `/blog/coupang-review-analysis`
- `/blog/coupang-negative-review-response`
- `/blog/smartstore-review-management`
- `/blog/coupang-rating-drop-reasons`
- `/blog/coupang-review-csv-export`
- `/blog/increase-coupang-sales-with-reviews`
- `/terms`
- `/privacy`

## 핵심 키워드

- 쿠팡 리뷰 분석
- 스마트스토어 리뷰 분석
- AI 리뷰 분석
- 리뷰 분석 툴
- 리뷰 CSV 분석
- 고객 리뷰 분석
- 리뷰 키워드 분석
- 감성 분석 툴
- 쿠팡 부정리뷰 대응
- 부정리뷰 답글
- 리뷰 답글 템플릿
- 쿠팡 별점 낮아지는 이유
- 별점 관리
- 리뷰 기반 FAQ
- 상세페이지 개선
- 리뷰 데이터 분석
- 쿠팡 리뷰 CSV 추출
- 스마트스토어 리뷰 CSV 추출
- 스마트스토어 리뷰 관리
- 쿠팡 매출 올리는 법
- 이커머스 리뷰 분석
- 셀러 리뷰 관리
- 리뷰 리포트 생성
- 쿠팡 셀러 툴
- 스마트스토어 셀러 툴

## 질문형 랜딩 큐

1. 쿠팡 리뷰 CSV는 어떻게 추출하나요?
2. 스마트스토어 리뷰는 어떻게 한 번에 분석하나요?
3. 쿠팡 부정리뷰가 많을 때 무엇부터 고쳐야 하나요?
4. 쿠팡 별점이 떨어지는 이유는 어떻게 찾나요?
5. 리뷰 답글을 AI로 자동화할 수 있나요?
6. 리뷰 데이터를 상세페이지 개선에 어떻게 쓰나요?
7. 리뷰로 FAQ를 만드는 가장 쉬운 방법은 무엇인가요?
8. 리뷰 분석 리포트는 어떻게 공유하나요?
9. 로그인 없이 리뷰 분석이 가능한가요?
10. 쿠팡 매출을 올리려면 리뷰를 어떻게 봐야 하나요?

## 운영 체크리스트

### Search Console

1. Google Search Console에서 `도메인 속성`을 생성한다.
2. DNS TXT 레코드로 `reviewboost.co.kr` 소유권을 검증한다.
3. `https://reviewboost.co.kr/sitemap.xml` 을 제출한다.
4. 홈, 기능, 가이드, 블로그 대표 URL 5개를 URL Inspection으로 점검한다.
5. 새 템플릿 배포 후 `recrawl 요청 -> 리치결과 테스트 -> 색인 상태 확인` 순서로 검증한다.

### Cloudflare

1. Cloudflare의 Managed robots / AI crawler block 기능이 `GPTBot`, `ClaudeBot`, `Google-Extended` 차단 규칙을 prepend 하지 않도록 설정한다.
2. 앱이 생성한 `/robots.txt` 응답이 최종 응답이 되도록 운영한다.
3. 배포 후 라이브 `robots.txt`를 직접 열어 AI 차단 규칙이 다시 붙지 않았는지 확인한다.

### GA4

- assistant 유입은 `assistant_landing` 이벤트로 추적한다.
- 이벤트 파라미터:
  - `assistant_source`
  - `assistant_mode`
  - `landing_page_group`
  - `content_group`
  - `first_touch_path`
- `utm_source=chatgpt.com` 이 있으면 OpenAI 유입으로 우선 분류한다.
- referrer 기반 분류는 `claude.ai`, `perplexity.ai`, `gemini.google.com`, `copilot.microsoft.com` 을 우선 처리한다.

## 확장 프로그램 검색·AI 검색 개선 (2026-10-07)

- `/extension`은 서버에서 HTML을 생성한다. 상품 설명, 10개 쇼핑몰 목록, 사용 단계, 무료·유료 한도와 FAQ를 로그인이나 클라이언트 JavaScript 없이 읽을 수 있다.
- 최상위 `loading.tsx`를 `(auth)/loading.tsx`로 옮겨 공개 페이지의 본문이 JavaScript로 해제해야 하는 숨겨진 Suspense 영역에 들어가지 않도록 했다. 대시보드는 기존 전용 로딩 화면을 유지한다.
- 제품 정보는 `src/lib/extension-content.ts`에서 관리하고 화면·SoftwareApplication/FAQPage JSON-LD·기존 `/llms.txt`에 함께 사용한다. 한도는 실제 확장 프로그램 설정과 테스트로 대조한다.
- canonical과 Open Graph URL은 `/extension`으로 일치시키고, 전용 1200×630 공유 이미지를 제공한다. core sitemap과 헤더·푸터·홈·리뷰 추출 가이드에서 연결한다.
- `/extension-connect`, `/extension-report`는 기존 noindex를 유지하며 sitemap에 추가하지 않는다.
- `extension/STORE_LISTING.md`에 검색 의도가 분명한 제목·요약, 수집 한도, 제품 홈페이지 링크를 준비했다. Chrome·Firefox manifest의 `homepage_url`도 같은 제품 페이지를 가리킨다.

### 배포 후 확인

1. `/extension`, `/extension/opengraph-image`, `/sitemaps/core.xml`, `/llms.txt`의 운영 응답을 확인한다. 로컬 수정만으로 운영 페이지나 스토어 등록정보가 바뀌지는 않는다.
2. Search Console에서 `/extension` URL 검사와 색인 요청을 진행하고 노출·클릭·쿼리 변화를 확인한다. AI 검색 기능 포함 여부도 Search Console 설정에서 확인한다.
3. 스토어 등록정보를 갱신할 때 제품 홈페이지와 위 문서를 사용한다. manifest 수정은 다음 확장 프로그램 배포에 포함한다.
4. 실제 소셜 서비스에서 공유 이미지 표시를 확인한다. 개발 환경 이미지 검증은 운영 서비스의 캐시 갱신까지 검증하지 않는다.

### 근거와 범위

- [Google의 AI 검색 최적화 안내](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide): 읽기 쉬운 고유 콘텐츠, 크롤링·색인 가능성, 명확한 사이트 구조가 기본이다. 별도 GEO/AEO schema나 `llms.txt`가 Google 검색 노출에 필요한 것은 아니다. 기존 `llms.txt`는 다른 소비자를 위한 제품 참고 정보로 유지한다.
- [Chrome 웹 스토어 등록정보 안내](https://developer.chrome.com/docs/webstore/best-listing): 이름과 설명에서 실제 기능을 분명히 전달한다. 키워드 반복, 존재하지 않는 평가·리뷰·기능을 추가하지 않는다.
- FAQ JSON-LD는 화면에 보이는 답변과 동일한 내용만 담는다. 리치 결과, 순위 상승 또는 AI 답변 인용을 보장하지 않는다.

## Extension as the main product (2026-10-07)

- Homepage, public navigation, pricing, features and help now lead with review collection and Excel/CSV export. AI analysis remains an optional workflow with its existing routes and plans.
- The primary CTA is Chrome installation; the first pricing comparison is free (50 reviews/day) versus Extension (KRW 4,900/month). All collection plans retain the 2,000-review per-run cap.
- Homepage product content and FAQs render on the server. The existing 30-second demonstration is user-controlled and explicitly labeled as an example.
- Root metadata, social image, manifest, structured data and `llms.txt` describe the collector. `/extension` remains the detailed product reference; the two marketplace guides link directly to installation.

### Acquisition and purchase measurement

- `extension_install_click` measures store-link clicks, not completed installs. `placement` distinguishes header, homepage, pricing and guides.
- Browser analytics queues events before Google's deferred script loads. Return query strings emit `checkout_return`, never verified revenue.
- Checkout captures a bounded first-touch source/medium/campaign for 30 days and retrieves available GA client/session IDs. Both redirect and overlay checkout carry those fields in Paddle custom data. This does not automatically carry UTMs across a Chrome Web Store installation or another browser/device.
- Signed Paddle completion webhooks send the standard GA4 `purchase` event with actual currency amounts, tax and a stable transaction ID. The Google Measurement Protocol API secret is server-only (`GA4_API_SECRET`, configured in Vercel Production). Sandbox/preview payments and visitors without a GA client ID are skipped.
- GA's transaction-ID deduplication handles repeated deliveries. Delivery failures return a retryable webhook response after entitlement is persisted. `billing_analytics_sent` records accepted HTTP deliveries; GA's collect endpoint acceptance alone does not prove report ingestion.
- Renewal events retain their own transaction IDs and do not reuse a checkout session older than 24 hours. Subscription creation no longer adds a second `extension_payment_completed` event.
- Paddle/database payments remain the financial source of truth. GA may omit blocked analytics and cannot reconstruct historic acquisition data. Do not interpret `checkout_return`, store clicks, or quota consumption as proof of a saved export.
- Google's non-ingesting validation endpoint accepted the purchase payload with zero validation messages. Verify attribution/revenue against the next real payment and subsequent renewal; no test purchase was charged to a customer.

### First distribution experiment and customer learning (2026-10-07)

- Published a distinct weekly review-checking tutorial on the existing Naver Blog: https://blog.naver.com/kwan765/224434516176. It discloses the developer's relationship to ReviewBoost, explains a repeat-use workflow and links to the existing demo and installation page. Source: `docs/marketing/2026-10-weekly-review-naver.html`.
- Campaign: `utm_source=naver_blog&utm_medium=referral&utm_campaign=weekly_review_20261007`. Review after seven days (October 14): campaign sessions → store-link clicks → attributed completed purchases, with self-reported sources as a separate measure. Store-link clicks are not installs, and cross-browser attribution remains incomplete. Do not call a channel successful based only on impressions or a handful of clicks.
- Paid users who successfully connect the extension can optionally answer two questions: intended task and discovery source. Neither question is required, and skipping sends no response. Answers use fixed options, are stored in first-party `funnel_events` with account-bound deduplication, and are not sent to GA4. Browser-local dismissal suppresses the prompt on return; another browser may show it again, but the server retains only the first response per account.
- The production audit found no new completed payment after the analytics release. The latest payment remains October 6, KRW 4,900. That customer's recorded paid usage occurred on the purchase date (30 usage events); this is evidence of use, not 30 exports or multi-day retention. Seven-day retention and the next monthly renewal are not yet observable for this customer.
- Chrome Web Store listing update submitted on October 7 using the publisher's happylife2080100 account, with automatic publication after approval enabled. Google confirmed submission. The existing v1.5.1 package, title/summary, category, video and screenshots remain in place; the detailed description, homepage/support links, permission explanations and data-use disclosures were updated. No new extension package was uploaded.
- `/extension-privacy` was corrected and deployed before submission to cover all ten marketplaces, local collection history, account tokens, usage telemetry, support email/messages and operator notifications. Typecheck and all 393 unit tests passed; production privacy/product/support pages returned HTTP 200.
- At 21:31 KST, Google rejected the first listing revision for **Yellow Argon / keyword spam**, specifically the ten-brand list in the description. The [spam FAQ](https://developer.chrome.com/docs/webstore/program-policies/spam-faq#keyword-spam) explicitly limits descriptions to five supported brands/sites. The revised 849-character description uses two examples and links to the full product-page list; the duplicate brand list in the single-purpose field was removed too. Google confirmed resubmission with automatic publication after approval enabled. No appeal or new binary was needed; approval is still pending.

## Extension discovery content pass (2026-10-25)

- Scope: one implementation pass for the customer job of saving shopping-site product reviews as Excel/CSV, with no paid promotion or new advertising spend. Improved existing pages and store source copy instead of creating thin keyword pages.
- Current product facts are aligned across `/extension`, visible FAQs, structured data and `/llms.txt`: 12 supported shopping sites, rating-only review inclusion, 50 reviews/day free, 2,000 reviews/run maximum and optional AI analysis.
- The help hub and extension page now link the existing Olive Young guide. Collection-intent articles and the blog hub use measurable `extension_install_click` actions; analysis articles retain the analysis CTA, and the separate Reviewisa article has no unrelated ReviewBoost footer CTA.
- Same-site article links no longer carry UTMs that would overwrite acquisition attribution. Store-link clicks remain clicks, not completed installations.
- Chrome, Firefox, Edge and Whale listing source documents now describe 1.6.1 and current collection capabilities. These are local source edits only: no store was submitted, no new review was approved and no live listing changed in this pass. Historical submission notes remain historical.
- Unsupported numerical, marketplace-ranking, time-saving and guaranteed sales/rating claims were removed or qualified. No customer outcome, ranking or AI citation is claimed.

### Current official guidance applied

- [Google AI features and your website](https://developers.google.com/search/docs/appearance/ai-features), last updated 2025-12-10 and checked 2026-10-25: AI Overviews and AI Mode require indexing and snippet eligibility; there is no additional technical requirement. Useful textual content, internal links, crawlability and matching structured data remain the foundation. AI-feature traffic is included in Search Console's Web performance report.
- [Chrome Web Store listing guidance](https://developer.chrome.com/docs/webstore/best-listing), checked 2026-10-25: use a concise functional title, accurate summary/description and current product screenshots; avoid keyword stuffing. No new AI-only schema, crawler rule or `llms.txt` requirement was added.

### Baseline and next manual review

- Deployment: commit `f564b0e` reached production on 2026-10-25 10:53 KST (Vercel `dpl_2MRHZqgXuhnuTSJ18oqGwMmxv6a7`, aliased to reviewboost.co.kr).
- Search Console baseline (web, **2026-09-25 to 2026-10-22**, read 2026-10-25): 21 clicks, 414 impressions, 5.1% CTR, average position 8.5. By page: `/` 17 clicks / 291 impressions; `/blog/reviewboost-extension-excel-guide` 3 / 93; `/help` 1 / 24; `/blog/cafe24-review-migration-checklist` 0 / 41; `clerk.reviewboost.co.kr/` 0 / 10. `/extension` had **zero impressions**.
- Index status at the same check: 5 indexed and 29 not indexed. The not-indexed breakdown was 11 stale `NOINDEX` exclusions (last crawled July–August; every sitemap URL now returns `index, follow`), 14 discovered-not-indexed, 3 redirects (`www`, `http`, `staging`) and 1 crawled-not-indexed. Search Console last refreshed its index data on 2026-10-16. The four submitted sitemaps are successful and cover 30 pages.
- Recrawl requests on 2026-10-25: `/extension`, `/help`, `/help/oliveyoung-review-csv-export`, `/blog`, `/blog/review-policy-disclosure-data-audit`, `/blog/reviewboost-extension-excel-guide`, `/blog/coupang-review-analysis`, `/blog/cafe24-review-migration-checklist`. All eight returned "색인 생성 요청됨" and entered the priority crawl queue. Five of the eight were not indexed at request time, including the product page `/extension` and the blog hub; that gap, not the copy itself, is the largest current discovery constraint.
- GA4 baseline (**2026-09-27 to 2026-10-24**, property `reviewboost`): 143 active users. `extension_install_click` 18 events / 14 users; `assistant_landing` 9 / 7. Sessions by source/medium included `google / organic` 31 and `chatgpt.com / ai-assistant` 21. The `placement` event parameter is not registered as a GA4 custom dimension, so a per-placement baseline (`blog_hub`, article placements) is **not measurable** without an admin change; only the total is recorded.
- Chrome Web Store baseline (2026-10-25): the public listing shows **99 users**. Listing views, weekly installs and uninstalls were **not** read because the developer dashboard required Google account reauthentication; they remain unmeasured, not zero. Firefox/Edge/Whale store analytics were out of scope for this pass.
- Review 28 days after deployment (**2026-11-22**): Search Console queries/impressions/clicks and indexing (confirm `/extension` and `/blog` are indexed, and that the stale `NOINDEX` exclusions cleared); GA4 `extension_install_click` totals plus `assistant_landing`; Chrome public user count and, if reauthenticated, dashboard listing views/installs/uninstalls. Keep these sources and denominators separate, and do not infer installs or purchases from clicks.
- For a small AI-answer baseline, use the existing `docs/marketing/ai-search-prompt-snapshot.md` manually and record tool/model/date/search status, mention, citation URL and factual accuracy. Do not convert a few answers into a market-share percentage. No automatic monitoring schedule was created.
