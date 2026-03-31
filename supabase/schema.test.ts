import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const schemaPath = resolve(process.cwd(), 'supabase/schema.sql');
const schema = readFileSync(schemaPath, 'utf8');

describe('supabase billing schema migration safety', () => {
  it('defines required billing columns for profiles and subscriptions', () => {
    expect(schema).toContain('paddle_customer_id text');
    expect(schema).toContain('paddle_subscription_id text');
    expect(schema).toContain('paddle_price_id text');
    expect(schema).toContain("plan_tier text not null default 'free'");
    expect(schema).toContain('current_period_start timestamptz');
    expect(schema).toContain('current_period_end timestamptz');
    expect(schema).toContain('cancel_at_period_end boolean not null default false');
  });

  it('keeps idempotent, lookup-friendly indexes', () => {
    expect(schema).toContain('create index if not exists profiles_paddle_customer_id_idx on public.profiles (paddle_customer_id);');
    expect(schema).toContain('create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);');
    expect(schema).toContain('create index if not exists subscriptions_customer_id_idx on public.subscriptions (paddle_customer_id);');
    expect(schema).toContain('create index if not exists subscriptions_paddle_subscription_id_idx on public.subscriptions (paddle_subscription_id);');
    expect(schema).toContain('create unique index if not exists subscriptions_paddle_subscription_id_uniq on public.subscriptions (paddle_subscription_id);');
  });

  it('uses additive migration guards and backfill-safe NOT NULL enforcement', () => {
    expect(schema).toContain('alter table public.subscriptions add column if not exists paddle_subscription_id text null;');
    expect(schema).toContain('alter table public.subscriptions add column if not exists current_period_start timestamptz null;');
    expect(schema).toContain('alter table public.subscriptions add column if not exists current_period_end timestamptz null;');
    expect(schema).toMatch(/if not exists \(\s*select 1 from public\.subscriptions[\s\S]*paddle_customer_id is null[\s\S]*paddle_subscription_id is null[\s\S]*\) then/);
    expect(schema).toContain('alter table public.subscriptions alter column paddle_customer_id set not null;');
    expect(schema).toContain('alter table public.subscriptions alter column paddle_subscription_id set not null;');
  });

  it('adds result payload storage for richer saved analyses', () => {
    expect(schema).toContain('result_payload jsonb null');
    expect(schema).toContain('alter table public.analyses add column if not exists result_payload jsonb null;');
  });
});
