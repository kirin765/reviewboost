#!/usr/bin/env node
/**
 * `/go/<slug>` 클릭 집계 출력.
 *
 *   npm run report:go-links            # 전체 기간
 *   npm run report:go-links -- --days 7
 *   npm run report:go-links -- --json
 *
 * funnel_events 의 outbound_click 만 읽는다(읽기 전용).
 * 크롤러·링크 미리보기 클릭은 bot_clicks 로 분리해 표시한다.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from '@neondatabase/serverless';

function loadDotEnv() {
  for (const file of ['.env.local', '.env']) {
    const path = join(process.cwd(), file);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

function parseArgs(argv) {
  const args = { days: null, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') args.json = true;
    else if (argv[i] === '--days') args.days = Number(argv[++i]);
    else if (argv[i].startsWith('--days=')) args.days = Number(argv[i].slice('--days='.length));
  }
  if (args.days !== null && (!Number.isInteger(args.days) || args.days <= 0)) {
    throw new Error('--days 는 1 이상의 정수여야 합니다.');
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
loadDotEnv();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL 이 없습니다. .env.local 을 확인하세요.');
  process.exit(1);
}

const pool = new Pool({ connectionString });
const since = args.days ? `now() - interval '${args.days} days'` : null;

try {
  const { rows } = await pool.query(
    `select coalesce(meta->>'slug', '(unknown)') as slug,
            count(*)::int as clicks,
            count(distinct meta->>'visitorId')::int as visitors,
            count(*) filter (where (meta->>'isBot')::boolean)::int as bot_clicks,
            max(created_at) as last_click
       from funnel_events
      where name = 'outbound_click'
        ${since ? `and created_at >= ${since}` : ''}
      group by 1
      order by clicks desc, slug asc`
  );
  const { rows: totals } = await pool.query(
    `select count(*)::int as clicks,
            count(distinct meta->>'visitorId')::int as visitors,
            count(*) filter (where (meta->>'isBot')::boolean)::int as bot_clicks
       from funnel_events
      where name = 'outbound_click'
        ${since ? `and created_at >= ${since}` : ''}`
  );

  if (args.json) {
    console.log(JSON.stringify({ window: args.days ? `${args.days}d` : 'all', total: totals[0], rows }, null, 2));
  } else if (rows.length === 0) {
    console.log(`outbound_click 기록이 없습니다 (${args.days ? `최근 ${args.days}일` : '전체 기간'}).`);
  } else {
    console.log(`기간: ${args.days ? `최근 ${args.days}일` : '전체'}`);
    console.table(rows);
    const total = totals[0];
    console.log(
      `합계: 클릭 ${total.clicks} / 순 방문자 ${total.visitors} / 봇 ${total.bot_clicks} (사람 클릭 약 ${total.clicks - total.bot_clicks})`
    );
  }
} finally {
  await pool.end();
}
