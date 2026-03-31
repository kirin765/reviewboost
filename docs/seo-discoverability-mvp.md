# ReviewBoost SEO / AI Discoverability MVP

## 목적

- 한국 이커머스 셀러 검색 수요에서 `리뷰 분석`, `부정리뷰 대응`, `리뷰 CSV 추출`, `FAQ 생성` 키워드를 선점한다.
- 검색 유입뿐 아니라 ChatGPT, Claude, Perplexity 같은 AI 도우미 유입을 GA4에서 구분 추적한다.
- 퍼블릭 랜딩과 실제 앱 워크스페이스를 분리해, 인덱싱은 마케팅 페이지 중심으로 관리한다.

## URL 구조

- `/`
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
