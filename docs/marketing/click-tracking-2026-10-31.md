# 클릭 측정 리디렉션 (`/go/<slug>`)

- 만든 날: 2026-10-31
- 목적: 블로그·스토리 글에서 카페24 앱스토어로 나가는 클릭 수를 자체 DB에 남긴다.
- 구현: `src/app/go/[slug]/route.ts` + `src/lib/go-links.ts` (DB: `funnel_events`)

## 왜 리디렉션을 거치나

외부 링크(`https://store.cafe24.com/...`)를 글에 바로 넣으면 ReviewBoost는 클릭을 알 수 없다.
`https://reviewboost.co.kr/go/<slug>` 를 넣으면 서버가 클릭을 기록한 뒤 앱스토어로 302 이동한다.

- 목적지는 `src/lib/go-links.ts` 의 목록에만 존재한다 → 목록에 없는 slug는 404. 열린 리디렉션(open redirect) 없음.
- 기록 실패(DB 미구성·오류)해도 리디렉션은 그대로 동작한다.
- 크롤러·링크 미리보기 UA는 `isBot: true` 로 남겨 집계에서 걸러낼 수 있다(리디렉션은 정상).
- `rb_vid` 쿠키(무작위 UUID, 180일)로 순 방문자를 구분한다. 개인 식별 정보가 아니다.

## 현재 등록된 링크

| slug | 쓰는 곳 | 목적지 |
|---|---|---|
| `reviewisa-cafe24-story-20261031` | 카페24 스토리 글 (2026-10-31, "상품 하나로 먼저 이전") | `https://store.cafe24.com/kr/apps/43542` |
| `reviewisa-cafe24-blog` | 사이트 블로그 CTA (`ReviewisaStoreLink`) | `https://store.cafe24.com/kr/apps/43542` |

스토리 글 마지막 문단에 넣을 링크:

```
👉 카페24 앱스토어에서 리뷰이사 기능·이용 조건 확인하기 (https://reviewboost.co.kr/go/reviewisa-cafe24-story-20261031)
```

## 새 캠페인 링크 추가

1. `src/lib/go-links.ts` 의 `goLinks` 배열에 항목 추가 (`slug`, `destination`, `label`, `campaign`, `createdAt`).
2. `npm test` → `npm run build` → 배포.
3. 글에는 `https://reviewboost.co.kr/go/<slug>` 를 넣는다.

slug 규칙: 소문자·숫자·하이픈, 80자 이내. 글·채널별로 slug를 나누면 어디서 온 클릭인지 구분된다.
(예: `reviewisa-naver-blog-2026-11`, `reviewisa-story-2026-11`)

UTM을 붙이면 `utm_source/medium/campaign/content/term` 만 목적지 URL로 전달된다.
예: `/go/reviewisa-cafe24-story-20261031?utm_source=naver&utm_campaign=story-20261031`

## 클릭 수 확인

```bash
npm run report:go-links                 # 전체 기간
npm run report:go-links -- --days 7     # 최근 7일
npm run report:go-links -- --json       # JSON
```

`DATABASE_URL` 은 배포 환경에만 있으므로, 로컬에서 보려면 `vercel env pull` 등으로 받아 `.env.local` 에 둔다.
DB 콘솔(Neon)에서는 같은 내용을 직접 조회할 수 있다.

```sql
select coalesce(meta->>'slug', '(unknown)') as slug,
       count(*)::int as clicks,
       count(distinct meta->>'visitorId')::int as visitors,
       count(*) filter (where (meta->>'isBot')::boolean)::int as bot_clicks,
       max(created_at) as last_click
  from funnel_events
 where name = 'outbound_click'
   and created_at >= now() - interval '30 days'
 group by 1
 order by clicks desc;
```

`meta` 에는 `slug`, `campaign`, `destination`, `referer`(경로만), `utm`, `isBot`, `visitorId` 가 들어간다.

## 이 숫자가 뜻하는 것 / 뜻하지 않는 것

- ✅ `/go/...` 링크가 클릭된 횟수, 순 방문자 수(쿠키 기준), 유입 referer·UTM
- ❌ 카페24 앱 설치 수, 구매자 수, 결제 전환, 매출

설치·결제는 카페24 판매자센터와 Paddle 대시보드에서 따로 확인해야 한다.
또한 서버 리디렉션은 GA4 아웃바운드 클릭 이벤트와 별개다(블로그 CTA는 `reviewisa_store_click` 도 함께 보낸다).
