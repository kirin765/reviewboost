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
    expect(schema).toContain('create table if not exists public.user_coupang_credentials');
    expect(schema).toContain('vendor_id_encrypted text');
    expect(schema).toContain('access_key_encrypted text');
    expect(schema).toContain('secret_key_encrypted text');
  });

  it('keeps idempotent, lookup-friendly indexes', () => {
    expect(schema).toContain('create index if not exists profiles_paddle_customer_id_idx on public.profiles (paddle_customer_id);');
    expect(schema).toContain('create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);');
    expect(schema).toContain('create index if not exists subscriptions_customer_id_idx on public.subscriptions (paddle_customer_id);');
    expect(schema).toContain('create index if not exists subscriptions_paddle_subscription_id_idx on public.subscriptions (paddle_subscription_id);');
    expect(schema).toContain('create unique index if not exists subscriptions_paddle_subscription_id_uniq on public.subscriptions (paddle_subscription_id);');
    expect(schema).toContain('create index if not exists user_coupang_credentials_updated_at_idx on public.user_coupang_credentials (updated_at);');
  });

  it('uses additive migration guards and backfill-safe NOT NULL enforcement', () => {
    expect(schema).toContain('alter table public.subscriptions add column if not exists paddle_subscription_id text null;');
    expect(schema).toContain('alter table public.subscriptions add column if not exists current_period_start timestamptz null;');
    expect(schema).toContain('alter table public.subscriptions add column if not exists current_period_end timestamptz null;');
    expect(schema).toContain('alter table public.user_coupang_credentials add column if not exists vendor_id_encrypted text;');
    expect(schema).toMatch(/if not exists \(\s*select 1 from public\.subscriptions[\s\S]*paddle_customer_id is null[\s\S]*paddle_subscription_id is null[\s\S]*\) then/);
    expect(schema).toContain('alter table public.subscriptions alter column paddle_customer_id set not null;');
    expect(schema).toContain('alter table public.subscriptions alter column paddle_subscription_id set not null;');
  });

  it('defines RLS policies for user coupang credentials', () => {
    expect(schema).toContain('create policy "user_coupang_credentials_select_own"');
    expect(schema).toContain('create policy "user_coupang_credentials_insert_own"');
    expect(schema).toContain('create policy "user_coupang_credentials_update_own"');
  });
});
